import cron from "node-cron";
import { sendWeeklySummaryEmails } from "./email";

export function startScheduler(): void {
  // Weekly summary: Fridays at 17:00 El Salvador time (America/El_Salvador)
  cron.schedule(
    "0 17 * * 5",
    async () => {
      console.log("[Scheduler] Running weekly summary job...");
      await sendWeeklySummaryEmails();
    },
    { timezone: "America/El_Salvador" },
  );

  console.log(
    "[Scheduler] Cron jobs started (weekly summary: Fridays 17:00 El Salvador time)",
  );
}
