import { Router } from "express";
import { db } from "../db/index";
import { plants } from "../db/schema";
import { eq } from "drizzle-orm";
import {
  requireAuth,
  requireTechnician,
  AuthRequest,
} from "../middleware/auth";
import { supabase } from "../lib/supabase";

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

router.get(
  "/:plantId/svg",
  requireAuth,
  requireTechnician,
  async (req: AuthRequest, res) => {
    try {
      const [plant] = await db
        .select()
        .from(plants)
        .where(eq(plants.id, req.params.plantId as string));

      if (!plant) {
        return res.status(404).json({ message: "Planta no encontrada" });
      }

      const { data, error } = await supabase.storage
        .from("plantas")
        .download(plant.svgPath!);

      if (error) {
        return res.status(500).json({ message: "Error al obtener el plano" });
      }

      const svgText = await data.text();

      res.json({ svg: svgText });
    } catch (error) {
      res.status(500).json({ message: "Error interno del servidor" });
    }
  },
);

export default router;
