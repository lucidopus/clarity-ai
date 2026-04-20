/**
 * Unit tests for lib/services/echo.ts.
 *
 * Exercises business logic with a mocked Echo model (no real MongoDB). The
 * point is to pin down: input validation, uniqueness error mapping, the
 * TTL cutoff on getPendingEcho, and the filter predicates used by the
 * state-transition writes.
 */

import mongoose from 'mongoose';

const mockSort = jest.fn();
const mockLean = jest.fn();
const mockExec = jest.fn();
const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockUpdateMany = jest.fn();
const mockCreate = jest.fn();

jest.mock('@/lib/models/Echo', () => ({
  __esModule: true,
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
    findOne: (...args: unknown[]) => mockFindOne(...args),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
    updateMany: (...args: unknown[]) => mockUpdateMany(...args),
  },
}));

import {
  createEcho,
  DuplicateEchoError,
  getPendingEcho,
  submitEchoAnswer,
  skipEcho,
  sweepExpiredEchos,
} from './echo';
import { CLARITY_MODE } from '@/lib/limits';

const USER_ID = new mongoose.Types.ObjectId();
const ECHO_ID = new mongoose.Types.ObjectId();

beforeEach(() => {
  jest.clearAllMocks();
  mockSort.mockReset();
  mockLean.mockReset();
  mockExec.mockReset();
  mockFindOne.mockReset();
  mockFindOneAndUpdate.mockReset();
  mockUpdateMany.mockReset();
  mockCreate.mockReset();
});

describe('createEcho', () => {
  test('trims and stores the question', async () => {
    mockCreate.mockResolvedValue({ _id: ECHO_ID, question: 'hi' });
    await createEcho({
      userId: USER_ID,
      sessionDate: '2026-04-19',
      question: '  hello   world  ',
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        sessionDate: '2026-04-19',
        question: 'hello world',
        outcome: 'pending',
        wasClaraAssisted: false,
      }),
    );
  });

  test('rejects empty question', async () => {
    await expect(
      createEcho({ userId: USER_ID, sessionDate: '2026-04-19', question: '   ' }),
    ).rejects.toThrow(/required/i);
  });

  test('rejects over-limit question', async () => {
    const tooLong = 'a'.repeat(CLARITY_MODE.echo.maxQuestionChars + 1);
    await expect(
      createEcho({ userId: USER_ID, sessionDate: '2026-04-19', question: tooLong }),
    ).rejects.toThrow(/too long/i);
  });

  test('maps MongoDB duplicate-key error to DuplicateEchoError', async () => {
    mockCreate.mockRejectedValue(Object.assign(new Error('E11000'), { code: 11000 }));
    await expect(
      createEcho({ userId: USER_ID, sessionDate: '2026-04-19', question: 'q?' }),
    ).rejects.toBeInstanceOf(DuplicateEchoError);
  });
});

describe('getPendingEcho', () => {
  test('queries only rows within the TTL window, sorted newest first', async () => {
    const fakeEcho = { _id: ECHO_ID, question: 'q?', outcome: 'pending' };
    mockFindOne.mockReturnValue({
      sort: () => ({
        lean: () => ({ exec: () => Promise.resolve(fakeEcho) }),
      }),
    });
    const now = new Date('2026-04-19T12:00:00Z');
    const result = await getPendingEcho(USER_ID, now);
    expect(result).toBe(fakeEcho);

    const call = mockFindOne.mock.calls[0][0];
    expect(call.userId.toString()).toBe(USER_ID.toString());
    expect(call.outcome).toBe('pending');
    const expectedCutoff = new Date(
      now.getTime() - CLARITY_MODE.echo.pendingTtlHours * 60 * 60 * 1000,
    );
    expect(call.createdAt.$gt.getTime()).toBe(expectedCutoff.getTime());
  });

  test('returns null when none found', async () => {
    mockFindOne.mockReturnValue({
      sort: () => ({
        lean: () => ({ exec: () => Promise.resolve(null) }),
      }),
    });
    const result = await getPendingEcho(USER_ID);
    expect(result).toBeNull();
  });
});

describe('submitEchoAnswer', () => {
  test('rejects invalid selfConfidence', async () => {
    await expect(
      submitEchoAnswer({
        userId: USER_ID,
        echoId: ECHO_ID,
        attemptedAnswer: 'a',
        selfConfidence: 6 as unknown as 5,
      }),
    ).rejects.toThrow(/1.{0,5}5/);
  });

  test('rejects empty answer', async () => {
    await expect(
      submitEchoAnswer({
        userId: USER_ID,
        echoId: ECHO_ID,
        attemptedAnswer: '   ',
        selfConfidence: 3,
      }),
    ).rejects.toThrow(/required/i);
  });

  test('rejects over-limit answer', async () => {
    const tooLong = 'a'.repeat(CLARITY_MODE.echo.maxAnswerChars + 1);
    await expect(
      submitEchoAnswer({
        userId: USER_ID,
        echoId: ECHO_ID,
        attemptedAnswer: tooLong,
        selfConfidence: 3,
      }),
    ).rejects.toThrow(/too long/i);
  });

  test('writes outcome=answered with a pending filter guard', async () => {
    mockFindOneAndUpdate.mockReturnValue({
      lean: () => Promise.resolve({ _id: ECHO_ID, outcome: 'answered' }),
    });
    await submitEchoAnswer({
      userId: USER_ID,
      echoId: ECHO_ID,
      attemptedAnswer: 'stuff',
      selfConfidence: 4,
    });
    const [filter, update] = mockFindOneAndUpdate.mock.calls[0];
    expect(filter.outcome).toBe('pending');
    expect(filter.userId.toString()).toBe(USER_ID.toString());
    expect(filter._id.toString()).toBe(ECHO_ID.toString());
    expect(update.$set.outcome).toBe('answered');
    expect(update.$set.selfConfidence).toBe(4);
    expect(update.$set.attemptedAnswer).toBe('stuff');
  });
});

describe('skipEcho', () => {
  test('writes outcome=skipped with pending filter guard', async () => {
    mockFindOneAndUpdate.mockReturnValue({
      lean: () => Promise.resolve({ _id: ECHO_ID, outcome: 'skipped' }),
    });
    await skipEcho(USER_ID, ECHO_ID);
    const [filter, update] = mockFindOneAndUpdate.mock.calls[0];
    expect(filter.outcome).toBe('pending');
    expect(update.$set.outcome).toBe('skipped');
  });
});

describe('sweepExpiredEchos', () => {
  test('updates pending Echoes older than TTL to skipped', async () => {
    mockUpdateMany.mockResolvedValue({ modifiedCount: 3 });
    const now = new Date('2026-04-19T12:00:00Z');
    const count = await sweepExpiredEchos(now);
    expect(count).toBe(3);
    const [filter, update] = mockUpdateMany.mock.calls[0];
    expect(filter.outcome).toBe('pending');
    const expectedCutoff = new Date(
      now.getTime() - CLARITY_MODE.echo.pendingTtlHours * 60 * 60 * 1000,
    );
    expect(filter.createdAt.$lte.getTime()).toBe(expectedCutoff.getTime());
    expect(update.$set.outcome).toBe('skipped');
  });

  test('returns 0 when updateMany returns no modifiedCount', async () => {
    mockUpdateMany.mockResolvedValue({});
    const count = await sweepExpiredEchos();
    expect(count).toBe(0);
  });
});
