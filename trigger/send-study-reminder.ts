import { schedules, logger } from "@trigger.dev/sdk";
import mongoose from "mongoose";
import User from "../lib/models/User";
import { sendStudyContractReminder } from "../lib/email";
import { computeNextReminderAt } from "../lib/services/studyContract";

// Bucketed-sweeper reminder pattern. Every minute we query users whose
// `nextReminderAt` is due in this minute bucket, atomically claim them by
// bumping the field forward, send the email, then move on. One schedule for
// all users — scales to millions because the hot path is a single indexed
// query + per-due-user atomic update, not per-user cron schedules.
export const sweepStudyReminders = schedules.task({
  id: "sweep-study-reminders",
  cron: "* * * * *",
  maxDuration: 300,
  run: async () => {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    const now = new Date();
    const bucketEnd = new Date(now.getTime() + 60 * 1000);

    const dueUsers = await User.find({
      nextReminderAt: { $ne: null, $lte: bucketEnd },
      studyContract: { $ne: null },
      emailVerified: true,
      'preferences.general.studyReminders': { $ne: false },
    })
      .select('email firstName studyContract nextReminderAt')
      .lean();

    if (dueUsers.length === 0) {
      return { scanned: 0, sent: 0 };
    }

    logger.info(`📬 Study-reminder sweep: ${dueUsers.length} user(s) due.`);

    let sent = 0;
    for (const u of dueUsers) {
      const typed = u as {
        _id: unknown;
        email?: string;
        firstName?: string;
        studyContract?: { windowStart: string; windowEnd: string; timezone: string } | null;
        nextReminderAt?: Date | null;
      };
      const contract = typed.studyContract;
      if (!contract || !typed.email) continue;

      // Anchor the next-fire computation to `bucketEnd`, not `now` — otherwise
      // a reminder scheduled inside the current bucket (e.g. 10:00:30 for a
      // sweep that started at 10:00:00) would resolve to itself again and get
      // re-picked up by the next minute's sweep, causing a duplicate email.
      const nextReminderAt = computeNextReminderAt(contract.windowStart, contract.timezone, 15, bucketEnd);

      // Optimistic claim: only we get to send if nextReminderAt is still what we read.
      const claim = await User.findOneAndUpdate(
        { _id: typed._id, nextReminderAt: typed.nextReminderAt },
        { $set: { nextReminderAt, studyContractLastRemindedAt: now } },
      ).lean();
      if (!claim) continue;

      try {
        await sendStudyContractReminder({
          to: typed.email,
          name: typed.firstName || 'there',
          windowStart: contract.windowStart,
          windowEnd: contract.windowEnd,
          timezone: contract.timezone,
          minutesUntilStart: 15,
        });
        sent += 1;
      } catch (err) {
        logger.warn(`Failed to send reminder to ${typed.email}`, {
          err: (err as Error).message,
        });
      }
    }

    logger.info(`✅ Sent ${sent} / ${dueUsers.length} study-window reminder(s).`);
    return { scanned: dueUsers.length, sent };
  },
});
