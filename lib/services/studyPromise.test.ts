/**
 * Unit tests for lib/services/studyPromise.ts.
 *
 * Mocks the StudyPromise model — no real MongoDB. Pins down: input
 * validation, uniqueness error mapping, the TTL cutoff on
 * getPendingStudyPromise, the filter predicates on review/sweep, and the
 * weekly summary ratio.
 */

import mongoose from 'mongoose';

const mockSort = jest.fn();
const mockLean = jest.fn();
const mockExec = jest.fn();
const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockUpdateMany = jest.fn();
const mockCreate = jest.fn();
const mockFind = jest.fn();

jest.mock('@/lib/models/StudyPromise', () => ({
  __esModule: true,
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
    findOne: (...args: unknown[]) => mockFindOne(...args),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
    updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    find: (...args: unknown[]) => mockFind(...args),
  },
}));

import {
  createStudyPromise,
  DuplicateStudyPromiseError,
  getPendingStudyPromise,
  reviewStudyPromise,
  sweepExpiredStudyPromises,
  getWeeklyPromiseSummary,
} from './studyPromise';
import { CLARITY_MODE } from '@/lib/limits';

const USER_ID = new mongoose.Types.ObjectId();
const PROMISE_ID = new mongoose.Types.ObjectId();

beforeEach(() => {
  jest.clearAllMocks();
  mockSort.mockReset();
  mockLean.mockReset();
  mockExec.mockReset();
  mockFindOne.mockReset();
  mockFindOneAndUpdate.mockReset();
  mockUpdateMany.mockReset();
  mockCreate.mockReset();
  mockFind.mockReset();
});

describe('createStudyPromise', () => {
  test('trims and stores the text', async () => {
    mockCreate.mockResolvedValue({ _id: PROMISE_ID, text: 'hi' });
    await createStudyPromise({
      userId: USER_ID,
      sessionDate: '2026-04-19',
      text: '  start with    the hard thing  ',
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        sessionDate: '2026-04-19',
        text: 'start with the hard thing',
        outcome: 'pending',
      }),
    );
  });

  test('rejects empty text', async () => {
    await expect(
      createStudyPromise({ userId: USER_ID, sessionDate: '2026-04-19', text: '   ' }),
    ).rejects.toThrow(/required/i);
  });

  test('rejects over-limit text', async () => {
    const tooLong = 'a'.repeat(CLARITY_MODE.promise.maxTextChars + 1);
    await expect(
      createStudyPromise({ userId: USER_ID, sessionDate: '2026-04-19', text: tooLong }),
    ).rejects.toThrow(/too long/i);
  });

  test('maps MongoDB duplicate-key error to DuplicateStudyPromiseError', async () => {
    mockCreate.mockRejectedValue(Object.assign(new Error('E11000'), { code: 11000 }));
    await expect(
      createStudyPromise({ userId: USER_ID, sessionDate: '2026-04-19', text: 'showing up' }),
    ).rejects.toBeInstanceOf(DuplicateStudyPromiseError);
  });
});

describe('getPendingStudyPromise', () => {
  test('queries only rows within the TTL window, sorted newest first', async () => {
    const fakePromise = { _id: PROMISE_ID, text: 'hi', outcome: 'pending' };
    mockFindOne.mockReturnValue({
      sort: () => ({
        lean: () => ({ exec: () => Promise.resolve(fakePromise) }),
      }),
    });
    const now = new Date('2026-04-19T12:00:00Z');
    const result = await getPendingStudyPromise(USER_ID, now);
    expect(result).toBe(fakePromise);

    const call = mockFindOne.mock.calls[0][0];
    expect(call.userId.toString()).toBe(USER_ID.toString());
    expect(call.outcome).toBe('pending');
    const expectedCutoff = new Date(
      now.getTime() - CLARITY_MODE.promise.pendingTtlHours * 60 * 60 * 1000,
    );
    expect(call.createdAt.$gt.getTime()).toBe(expectedCutoff.getTime());
  });

  test('returns null when none found', async () => {
    mockFindOne.mockReturnValue({
      sort: () => ({
        lean: () => ({ exec: () => Promise.resolve(null) }),
      }),
    });
    const result = await getPendingStudyPromise(USER_ID);
    expect(result).toBeNull();
  });

  test('ghost-Promise: 50h-old pending row is filtered at read time', async () => {
    // Service composes a `createdAt: {$gt: cutoff}` filter — the model would
    // honour it and return null. We assert the filter shape because the
    // mock can't actually run the query.
    mockFindOne.mockReturnValue({
      sort: () => ({
        lean: () => ({ exec: () => Promise.resolve(null) }),
      }),
    });
    const now = new Date('2026-04-19T12:00:00Z');
    const result = await getPendingStudyPromise(USER_ID, now);
    expect(result).toBeNull();

    const call = mockFindOne.mock.calls[0][0];
    const cutoff: Date = call.createdAt.$gt;
    const fiftyHoursAgo = new Date(now.getTime() - 50 * 60 * 60 * 1000);
    // Cutoff is 48h ago; a 50h-old createdAt sits BEFORE the cutoff and
    // would be filtered out by the `$gt` predicate.
    expect(fiftyHoursAgo.getTime()).toBeLessThan(cutoff.getTime());
  });
});

describe('reviewStudyPromise', () => {
  test('rejects invalid outcome', async () => {
    await expect(
      reviewStudyPromise({
        userId: USER_ID,
        promiseId: PROMISE_ID,
        outcome: 'pending' as unknown as 'kept',
      }),
    ).rejects.toThrow(/kept.{0,40}skipped/i);
  });

  test('writes outcome=kept with a pending filter guard', async () => {
    mockFindOneAndUpdate.mockReturnValue({
      lean: () => Promise.resolve({ _id: PROMISE_ID, outcome: 'kept' }),
    });
    await reviewStudyPromise({
      userId: USER_ID,
      promiseId: PROMISE_ID,
      outcome: 'kept',
    });
    const [filter, update] = mockFindOneAndUpdate.mock.calls[0];
    expect(filter.outcome).toBe('pending');
    expect(filter.userId.toString()).toBe(USER_ID.toString());
    expect(filter._id.toString()).toBe(PROMISE_ID.toString());
    expect(update.$set.outcome).toBe('kept');
    expect(update.$set.reviewedAt).toBeInstanceOf(Date);
  });

  test('writes outcome=broke when reported', async () => {
    mockFindOneAndUpdate.mockReturnValue({
      lean: () => Promise.resolve({ _id: PROMISE_ID, outcome: 'broke' }),
    });
    await reviewStudyPromise({
      userId: USER_ID,
      promiseId: PROMISE_ID,
      outcome: 'broke',
    });
    const [, update] = mockFindOneAndUpdate.mock.calls[0];
    expect(update.$set.outcome).toBe('broke');
  });

  test('writes outcome=skipped when reported', async () => {
    mockFindOneAndUpdate.mockReturnValue({
      lean: () => Promise.resolve({ _id: PROMISE_ID, outcome: 'skipped' }),
    });
    await reviewStudyPromise({
      userId: USER_ID,
      promiseId: PROMISE_ID,
      outcome: 'skipped',
    });
    const [, update] = mockFindOneAndUpdate.mock.calls[0];
    expect(update.$set.outcome).toBe('skipped');
  });
});

describe('sweepExpiredStudyPromises', () => {
  test('updates pending Promises older than TTL to skipped', async () => {
    mockUpdateMany.mockResolvedValue({ modifiedCount: 4 });
    const now = new Date('2026-04-19T12:00:00Z');
    const count = await sweepExpiredStudyPromises(now);
    expect(count).toBe(4);
    const [filter, update] = mockUpdateMany.mock.calls[0];
    expect(filter.outcome).toBe('pending');
    const expectedCutoff = new Date(
      now.getTime() - CLARITY_MODE.promise.pendingTtlHours * 60 * 60 * 1000,
    );
    expect(filter.createdAt.$lte.getTime()).toBe(expectedCutoff.getTime());
    expect(update.$set.outcome).toBe('skipped');
    expect(update.$set.reviewedAt).toBeInstanceOf(Date);
  });

  test('does not touch already-reviewed rows (filter excludes non-pending)', async () => {
    mockUpdateMany.mockResolvedValue({ modifiedCount: 0 });
    await sweepExpiredStudyPromises();
    const [filter] = mockUpdateMany.mock.calls[0];
    expect(filter.outcome).toBe('pending');
  });

  test('returns 0 when updateMany returns no modifiedCount', async () => {
    mockUpdateMany.mockResolvedValue({});
    const count = await sweepExpiredStudyPromises();
    expect(count).toBe(0);
  });
});

describe('getWeeklyPromiseSummary', () => {
  test('counts only reviewed outcomes in the 7-day window', async () => {
    mockFind.mockReturnValue({
      select: () => ({
        lean: () => ({
          exec: () => Promise.resolve([
            { outcome: 'kept' },
            { outcome: 'kept' },
            { outcome: 'broke' },
            { outcome: 'skipped' },
          ]),
        }),
      }),
    });
    const now = new Date('2026-04-19T12:00:00Z');
    const summary = await getWeeklyPromiseSummary(USER_ID, now);
    expect(summary.kept).toBe(2);
    expect(summary.total).toBe(4);
    expect(summary.windowEnd).toBe(now);

    const call = mockFind.mock.calls[0][0];
    expect(call.outcome.$in).toEqual(['kept', 'broke', 'skipped']);
    const expectedStart = new Date(
      now.getTime() - CLARITY_MODE.promise.weeklySummaryDays * 24 * 60 * 60 * 1000,
    );
    expect(call.reviewedAt.$gte.getTime()).toBe(expectedStart.getTime());
    expect(call.reviewedAt.$lt.getTime()).toBe(now.getTime());
  });

  test('returns 0 / 0 when no reviewed Promises in window', async () => {
    mockFind.mockReturnValue({
      select: () => ({
        lean: () => ({ exec: () => Promise.resolve([]) }),
      }),
    });
    const summary = await getWeeklyPromiseSummary(USER_ID);
    expect(summary.kept).toBe(0);
    expect(summary.total).toBe(0);
  });
});
