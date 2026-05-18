import { Router } from "express";
import { db } from "../db/index";
import { plants } from "../db/schema";
import { eq } from "drizzle-orm";
import {
  requireAuth,
  requireTechnician,
  AuthRequest,
} from "../middleware/auth";

const router = Router();

// Técnico ve todas las plantas
router.get(
  "/",
  requireAuth,
  requireTechnician,
  async (req: AuthRequest, res) => {
    try {
      const result = await db.select().from(plants);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Error interno del servidor" });
    }
  },
);

// Cliente ve solo sus plantas
router.get("/my-plants", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await db
      .select()
      .from(plants)
      .where(eq(plants.clientId, req.user!.id));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default router;
