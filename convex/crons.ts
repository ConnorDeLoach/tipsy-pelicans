import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.weekly(
  "weekly game reminder",
  {
    dayOfWeek: "monday",
    hourUTC: 14,
    minuteUTC: 0,
  },
  internal.reminders.weeklyGameReminder
);

crons.weekly(
  "weekly game reminder (Thu)",
  { dayOfWeek: "thursday", hourUTC: 14, minuteUTC: 0 },
  internal.reminders.weeklyGameReminder
);

export default crons;
