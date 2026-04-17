import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key if available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface SendVerificationEmailParams {
  to: string;
  otp: string;
  name: string;
}

interface SendPasswordResetEmailParams {
  to: string;
  name: string;
  resetUrl: string;
}

interface SendStudyContractReminderParams {
  to: string;
  name: string;
  windowStart: string;
  windowEnd: string;
  timezone: string;
  minutesUntilStart: number;
  /** Test-only — forces a specific subject template index (bypasses random). */
  _forceSubjectIdx?: number;
  /** Test-only — forces a specific body template index (bypasses random). */
  _forceBodyIdx?: number;
}

interface ReminderTemplateCtx {
  durationLabel: string;
  startTimeLabel: string;
}

interface BodyTemplate {
  subhead: (ctx: ReminderTemplateCtx) => string;
  body: (ctx: ReminderTemplateCtx) => string;
}

/**
 * Subject + body pools for the 15-min pre-window reminder. Each send picks
 * one of each at random so the daily reminder doesn't get habituation-filtered
 * in the inbox. Subjects are independent of bodies — any pair works.
 *
 * Tone: "professional athlete of learning." Spare, high-status, respects the
 * user's own commitment (no 5-min floors; the streak/shield system is the
 * separate safety net). Angles: minimalist / transition / contract / silence /
 * friend / ownership / identity.
 */
const SUBJECT_TEMPLATES_UPCOMING: Array<(ctx: ReminderTemplateCtx) => string> = [
  () => 'Your focus session starts in 15 minutes.',
  ({ durationLabel }) => `15 minutes until ${durationLabel} of focus.`,
  ({ durationLabel }) => `${durationLabel}. Starts in 15.`,
  ({ durationLabel }) => `Your ${durationLabel} window opens in 15 minutes.`,
  ({ durationLabel }) => `15 minutes to your ${durationLabel}.`,
  ({ durationLabel }) => `In 15 minutes: ${durationLabel} of focus.`,
  ({ durationLabel }) => `${durationLabel} is next. 15 minutes out.`,
];

const BODY_TEMPLATES_UPCOMING: BodyTemplate[] = [
  // Minimalist
  {
    subhead: ({ durationLabel }) => `${durationLabel}. Your call.`,
    body: () => "It's time soon.",
  },
  // Transition — tactical ritual
  {
    subhead: ({ durationLabel }) => `Your ${durationLabel} focus window.`,
    body: ({ startTimeLabel }) =>
      `Fifteen minutes to clear your desk, grab water, and put your phone in the other room. We start at ${startTimeLabel}.`,
  },
  // Contract — accountability (softened, no guilt-trip)
  {
    subhead: ({ durationLabel }) => `You set aside ${durationLabel}.`,
    body: () => 'This is the window you set aside. Fifteen minutes to get ready for it.',
  },
  // Silence — luxury / emotional
  {
    subhead: ({ durationLabel }) => `Reserved: ${durationLabel} of quiet.`,
    body: ({ durationLabel }) =>
      `The world can wait for ${durationLabel}. This time is yours. See you in fifteen.`,
  },
  // Friend — warm, no assumptions about what the user is doing
  {
    subhead: ({ durationLabel }) => `Your ${durationLabel}.`,
    body: () =>
      "Fifteen-minute heads up — find a good stopping point for whatever you're on and we'll see you here.",
  },
  // Ownership
  {
    subhead: ({ durationLabel }) => `You set aside ${durationLabel}.`,
    body: () => 'This is the block you put on your calendar. Own it.',
  },
  // Identity (softened — no manifestation-speak)
  {
    subhead: ({ durationLabel }) => `You chose this ${durationLabel}.`,
    body: () => 'Not because someone asked. Because it matters to you.',
  },
];

const SUBJECT_TEMPLATES_NOW: Array<(ctx: ReminderTemplateCtx) => string> = [
  () => 'Your focus session starts now.',
  ({ durationLabel }) => `${durationLabel} of focus. Starting now.`,
  ({ durationLabel }) => `Your ${durationLabel} window just opened.`,
];

const BODY_TEMPLATES_NOW: BodyTemplate[] = [
  {
    subhead: ({ durationLabel }) => `${durationLabel}. Your call.`,
    body: () => "It's time.",
  },
  {
    subhead: ({ durationLabel }) => `Your ${durationLabel} focus window.`,
    body: () =>
      'Clear your desk, grab water, and put your phone in the other room. We start now.',
  },
  {
    subhead: ({ durationLabel }) => `You set aside ${durationLabel}.`,
    body: () => 'This is the window you set aside. It starts now.',
  },
];

function pickIdx(len: number, forced: number | undefined): number {
  if (typeof forced === 'number' && forced >= 0 && forced < len) return forced;
  return Math.floor(Math.random() * len);
}

export const REMINDER_TEMPLATE_COUNTS = {
  subjectsUpcoming: SUBJECT_TEMPLATES_UPCOMING.length,
  bodiesUpcoming: BODY_TEMPLATES_UPCOMING.length,
  subjectsNow: SUBJECT_TEMPLATES_NOW.length,
  bodiesNow: BODY_TEMPLATES_NOW.length,
};

/** Escape user-provided strings before interpolating into HTML email templates. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export async function sendVerificationEmail({ to, otp, name }: SendVerificationEmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY is not defined. Email sending skipped.');
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV MODE] Verification OTP for ${to}: ${otp}`);
    }
    return false;
  }

  if (!process.env.EMAIL_FROM) {
    console.warn('EMAIL_FROM is not defined. Email sending skipped.');
    return false;
  }

  const msg = {
    to,
    from: {
      email: process.env.EMAIL_FROM,
      name: 'Clarity AI', // Display name
    },
    subject: 'Verify your Clarity AI account',
    text: `Hello ${name},\n\nYour verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify your email address</h2>
        <p>Hello ${escapeHtml(name)},</p>
        <p>Thank you for signing up for Clarity AI. Please use the following code to verify your email address:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
          <h1 style="color: #000; letter-spacing: 5px; margin: 0;">${escapeHtml(otp)}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">If you didn't request this code, you can ignore this email.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    if ((error as { response?: { body: unknown } })?.response) {
      console.error((error as { response: { body: unknown } }).response.body);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[EMAIL FAIL FALLBACK] Verification OTP for ${to}: ${otp}`);
    }
    return false;
  }
}

export async function sendPasswordResetEmail({ to, name, resetUrl }: SendPasswordResetEmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY is not defined. Email sending skipped.');
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV MODE] Password reset link for ${to}: ${resetUrl}`);
    }
    return false;
  }

  if (!process.env.EMAIL_FROM) {
    console.warn('EMAIL_FROM is not defined. Email sending skipped.');
    return false;
  }

  const msg = {
    to,
    from: {
      email: process.env.EMAIL_FROM,
      name: 'Clarity AI',
    },
    subject: 'Reset your Clarity AI password',
    text: `Hello ${name},\n\nWe received a request to reset your password. Use this link to set a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request a password reset, you can safely ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset your password</h2>
        <p>Hello ${escapeHtml(name)},</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${escapeHtml(resetUrl)}" style="background-color: #0ea5e9; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #666; font-size: 13px;">Or copy and paste this link into your browser:</p>
        <p style="color: #666; font-size: 13px; word-break: break-all;">${escapeHtml(resetUrl)}</p>
        <p>This link expires in 1 hour.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    if ((error as { response?: { body: unknown } })?.response) {
      console.error((error as { response: { body: unknown } }).response.body);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[EMAIL FAIL FALLBACK] Password reset link for ${to}: ${resetUrl}`);
    }
    return false;
  }
}

/**
 * Supportive pre-window nudge — never fear-based.
 * Sent ~15 minutes before the user's self-chosen study window opens.
 */
export async function sendStudyContractReminder({
  to,
  name,
  windowStart,
  windowEnd,
  timezone,
  minutesUntilStart,
  _forceSubjectIdx,
  _forceBodyIdx,
}: SendStudyContractReminderParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY is not defined. Reminder email skipped.');
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV MODE] Study window reminder for ${to}: ${windowStart}–${windowEnd} ${timezone}`);
    }
    return false;
  }
  if (!process.env.EMAIL_FROM) {
    console.warn('EMAIL_FROM is not defined. Reminder email skipped.');
    return false;
  }

  const formatTime12 = (hhmm: string): string => {
    const [hRaw, mRaw] = hhmm.split(':').map(Number);
    const h = hRaw ?? 0;
    const m = mRaw ?? 0;
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const suffix = h < 12 ? 'AM' : 'PM';
    return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${m.toString().padStart(2, '0')} ${suffix}`;
  };

  // Human-readable duration: "15 minutes", "1 hour", "1 hour 30 minutes",
  // "2 hours". Keeps the email copy natural whether the lead time is 15 min
  // or 2 hours, and whether the window itself is 30 min or 2 hours long.
  const formatDuration = (totalMinutes: number): string => {
    if (totalMinutes <= 0) return 'a moment';
    if (totalMinutes === 1) return '1 minute';
    if (totalMinutes < 60) return `${totalMinutes} minutes`;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const hUnit = h === 1 ? 'hour' : 'hours';
    if (m === 0) return `${h} ${hUnit}`;
    const mUnit = m === 1 ? 'minute' : 'minutes';
    return `${h} ${hUnit} ${m} ${mUnit}`;
  };

  const parseHHMM = (hhmm: string): number => {
    const [h, m] = hhmm.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const startLabel = formatTime12(windowStart);
  const endLabel = formatTime12(windowEnd);
  const windowMinutes = parseHHMM(windowEnd) - parseHHMM(windowStart);
  const windowDurationLabel = formatDuration(Math.max(0, windowMinutes));
  const isNow = minutesUntilStart <= 1;
  const ctaUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://clarityai.app'}/dashboard`;

  const ctx: ReminderTemplateCtx = {
    durationLabel: windowDurationLabel,
    startTimeLabel: startLabel,
  };

  const subjectPool = isNow ? SUBJECT_TEMPLATES_NOW : SUBJECT_TEMPLATES_UPCOMING;
  const bodyPool = isNow ? BODY_TEMPLATES_NOW : BODY_TEMPLATES_UPCOMING;

  const subjectIdx = pickIdx(subjectPool.length, _forceSubjectIdx);
  const bodyIdx = pickIdx(bodyPool.length, _forceBodyIdx);

  const subject = subjectPool[subjectIdx](ctx);
  const heroLine = subject;
  const subLine = bodyPool[bodyIdx].subhead(ctx);
  const bodyLine = bodyPool[bodyIdx].body(ctx);

  const preheader = subLine;

  const textVersion = [
    `Hey ${name},`,
    ``,
    heroLine,
    subLine,
    ``,
    bodyLine,
    ``,
    `Open Clarity: ${ctaUrl}`,
    ``,
    `Picked the wrong time? Change it from your dashboard settings.`,
  ].join('\n');

  const msg = {
    to,
    from: { email: process.env.EMAIL_FROM, name: 'Clarity AI' },
    subject,
    text: textVersion,
    html: `
      <!-- preheader: shown in inbox preview, hidden in the rendered email -->
      <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#ffffff;opacity:0;">
        ${escapeHtml(preheader)}
      </div>

      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #111827; background: #ffffff;">
        <div style="height: 3px; width: 32px; background: #06b6d4; border-radius: 2px; margin-bottom: 28px;"></div>

        <p style="margin: 0 0 18px; font-size: 16px; color: #111827;">
          Hey ${escapeHtml(name)},
        </p>

        <h1 style="margin: 0 0 10px; font-size: 22px; font-weight: 600; line-height: 1.3; color: #111827;">
          ${escapeHtml(heroLine)}
        </h1>

        <p style="margin: 0 0 22px; font-size: 17px; font-weight: 600; line-height: 1.4; color: #06b6d4;">
          ${escapeHtml(subLine)}
        </p>

        <p style="margin: 0 0 28px; font-size: 16px; line-height: 1.55; color: #374151;">
          ${escapeHtml(bodyLine)}
        </p>

        <a href="${escapeHtml(ctaUrl)}"
           style="display: inline-block; background: #06b6d4; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 15px; font-weight: 600; letter-spacing: 0.01em;">
          Open Clarity →
        </a>

        <p style="margin: 40px 0 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
          Your window: ${escapeHtml(startLabel)} – ${escapeHtml(endLabel)} (${escapeHtml(windowDurationLabel)}, ${escapeHtml(timezone.replace('_', ' '))}). Picked the wrong time? Change it from your dashboard settings.
        </p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending study contract reminder:', error);
    if ((error as { response?: { body: unknown } })?.response) {
      console.error((error as { response: { body: unknown } }).response.body);
    }
    return false;
  }
}
