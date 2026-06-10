import { Router } from "express";
import { db } from "../db/index";
import { mesas, mesaWashes, washSessions, cleaningCycles } from "../db/schema";
import { eq, count, and, isNull } from "drizzle-orm";
import {
  requireAuth,
  AuthRequest,
  requireTechnician,
  requirePlantAccess,
} from "../middleware/auth";

const router = Router();

// Obtener todas las mesas de una planta
router.get(
  "/:plantId",
  requireAuth,
  requirePlantAccess,
  async (req: AuthRequest, res) => {
    try {
      const result = await db
        .select()
        .from(mesas)
        .where(eq(mesas.plantId, req.params.plantId as string));

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Error interno del servidor" });
    }
  },
);

// Iniciar lavado de una mesa escaneando su QR
router.post(
  "/scan/start",
  requireAuth,
  requireTechnician,
  async (req: AuthRequest, res) => {
    const { code, sessionId } = req.body;

    try {
      const [mesa] = await db.select().from(mesas).where(eq(mesas.code, code));

      if (!mesa) {
        return res.status(404).json({ message: "Mesa no encontrada" });
      }

      // Crear registro de lavado
      const [mesaWash] = await db
        .insert(mesaWashes)
        .values({
          sessionId,
          mesaId: mesa.id,
        })
        .returning();

      // Actualizar estado de la mesa
      const [mesaActualizada] = await db
        .update(mesas)
        .set({ status: "in_progress" })
        .where(eq(mesas.id, mesa.id))
        .returning();

      res.json({ mesaWash, mesa: mesaActualizada });
    } catch (error) {
      res.status(500).json({ message: "Error interno del servidor" });
    }
  },
);

// Finalizar lavado de una mesa
router.post(
  "/scan/finish",
  requireAuth,
  requireTechnician,
  async (req: AuthRequest, res) => {
    const { code } = req.body;

    try {
      const [mesa] = await db.select().from(mesas).where(eq(mesas.code, code));

      if (!mesa) {
        return res.status(404).json({ message: "Mesa no encontrada" });
      }

      // Buscar el lavado activo de esta mesa
      const [mesaWash] = await db
        .select()
        .from(mesaWashes)
        .where(eq(mesaWashes.mesaId, mesa.id));

      const finishedAt = new Date();
      const startedAt = new Date(mesaWash.startedAt!);
      const durationSeconds = Math.floor(
        (finishedAt.getTime() - startedAt.getTime()) / 1000,
      );

      // Actualizar el registro de lavado
      await db
        .update(mesaWashes)
        .set({ finishedAt, durationSeconds })
        .where(eq(mesaWashes.id, mesaWash.id));

      // Marcar mesa como lavada
      const [mesaActualizada] = await db
        .update(mesas)
        .set({ status: "done" })
        .where(eq(mesas.id, mesa.id))
        .returning();

      // Check if all mesas for this plant are done
      const [{ total }] = await db
        .select({ total: count() })
        .from(mesas)
        .where(eq(mesas.plantId, mesa.plantId));

      const [{ done }] = await db
        .select({ done: count() })
        .from(mesas)
        .where(
          and(eq(mesas.plantId, mesa.plantId), eq(mesas.status, "done")),
        );

      // If all done → finish active cycle + reset all mesas to pending
      if (total === done) {
        await db
          .update(cleaningCycles)
          .set({ finishedAt: new Date() })
          .where(
            and(
              eq(cleaningCycles.plantId, mesa.plantId),
              isNull(cleaningCycles.finishedAt),
            ),
          );

        await db
          .update(mesas)
          .set({ status: "pending" })
          .where(eq(mesas.plantId, mesa.plantId));
      }

      res.json({ durationSeconds, mesa: mesaActualizada });
    } catch (error) {
      res.status(500).json({ message: "Error interno del servidor" });
    }
  },
);

export default router;
