import { schedules, logger } from "@trigger.dev/sdk";
import mongoose from "mongoose";
import User from "../lib/models/User";
import { minutesUntilWindowStart } from "../lib/services/studyContract";
import { sendStudyContractReminder } from "../lib/email";

// Scan users every 15 minutes for pre-window reminders. We send exactly one
// supportive nudge per calendar day in the user's timezone — never fear-based,
// always tied to the window they chose themselves (Gollwitzer).
const REMINDER_LEAD_MIN = 15;
const WINDOW_TOLERANCE_MIN = 16; // covers the 15-min cadence plus jitter

function localYmd(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  let y = '0000'; let m = '00'; let d = '00';
  for (const p of parts) {
    if (p.type === 'year') y = p.value;
    else if (p.type === 'month') m = p.value;
    else if (p.type === 'day') d = p.value;
  }
  return `${y}-${m}-${d}`;
}

export const remindStudyContract = schedules.task({
  id: "remind-study-contract",
  cron: "*/15 * * * *", // every 15 min, UTC
  maxDuration: 300,
  run: async () => {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    const now = new Date();

    const users = await User.find({
      studyContract: { $ne: null },
      emailVerified: true,
      'preferences.general.studyReminders': { $ne: false },
    })
      .select('email firstName studyContract studyContractLastRemindedAt')
      .lean();

    logger.info(`📬 Scanning ${users.length} users for study-window reminders.`);

    let sent = 0;
    for (const u of users) {
      const contract = (u as { studyContract?: { windowStart: string; windowEnd: string; timezone: string } | null }).studyContract;
      if (!contract) continue;

      const minutesUntil = minutesUntilWindowStart(contract, now);
      if (minutesUntil === null) continue;

      // Fire only when the window is about to open: (REMINDER_LEAD_MIN - tolerance) <= minutesUntil <= REMINDER_LEAD_MIN
      if (minutesUntil > REMINDER_LEAD_MIN) continue;
      if (minutesUntil < REMINDER_LEAD_MIN - WINDOW_TOLERANCE_MIN) continue;

      const todayLocal = localYmd(now, contract.timezone);
      const last = (u as { studyContractLastRemindedAt?: Date | null }).studyContractLastRemindedAt;
      const lastLocal = last ? localYmd(new Date(last), contract.timezone) : null;
      if (lastLocal === todayLocal) continue;

      const email = (u as { email?: string }).email;
      const firstName = (u as { firstName?: string }).firstName || 'there';
      if (!email) continue;

      try {
        await sendStudyContractReminder({
          to: email,
          name: firstName,
          windowStart: contract.windowStart,
          windowEnd: contract.windowEnd,
          timezone: contract.timezone,
          minutesUntilStart: Math.max(0, minutesUntil),
        });
        await User.updateOne(
          { _id: (u as { _id: unknown })._id },
          { $set: { studyContractLastRemindedAt: new Date() } },
        );
        sent += 1;
      } catch (err) {
        logger.warn(`Failed to send contract reminder to ${email}`, {
          err: (err as Error).message,
        });
      }
    }

    logger.info(`✅ Sent ${sent} study-window reminder(s).`);
    return { scanned: users.length, sent };
  },
});
