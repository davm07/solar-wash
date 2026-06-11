import { Router } from "express";
import { sendCycleCompletionEmail, sendWeeklySummaryEmails } from "../lib/email";

const router = Router();

router.post("/cycle-email/:cycleId", async (req, res) => {
  try {
    const overrideEmail = req.query.email as string | undefined;
    await sendCycleCompletionEmail(req.params.cycleId, overrideEmail);
    res.json({ message: "Cycle completion email sent (check server logs)" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send email", error });
  }
});

router.post("/weekly-summary", async (req, res) => {
  try {
    const overrideEmail = req.query.email as string | undefined;
    await sendWeeklySummaryEmails(overrideEmail);
    res.json({ message: "Weekly summary sent (check server logs)" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send email", error });
  }
});

export default router;
