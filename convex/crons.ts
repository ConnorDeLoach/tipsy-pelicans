import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

const reminders = (internal as Record<string, any>).reminders;

crons.weekly(
  "weekly game reminder",
  {
    dayOfWeek: "monday",
    hourUTC: 14,
    minuteUTC: 0,
  },
  reminders.weeklyGameReminder,
);

export default crons;
