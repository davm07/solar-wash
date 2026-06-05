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
      const plantsWithUrls = await Promise.all(
        result.map(async (plant) => {
          if (!plant.svgPath) return plant;

          const { data } = await supabase.storage
            .from("mi-bucket")
            .createSignedUrl(plant.svgPath, 300);

          return { ...plant, fileUrl: data?.signedUrl };
        }),
      );

      res.json(plantsWithUrls);
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

    const plantsWithUrls = await Promise.all(
      result.map(async (plant) => {
        if (!plant.svgPath) return plant;

        const { data } = await supabase.storage
          .from("mi-bucket")
          .createSignedUrl(plant.svgPath, 300);

        return { ...plant, fileUrl: data?.signedUrl };
      }),
    );

    res.json(plantsWithUrls);
  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default router;
