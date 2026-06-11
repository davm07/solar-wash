import { Router } from "express";
import { db } from "../db/index";
import { mesas, mesaWashes, cleaningCycles } from "../db/schema";
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

      // Check if this mesa already has a wash record in THIS session
      const [existingInSession] = await db
        .select()
        .from(mesaWashes)
        .where(
          and(
            eq(mesaWashes.mesaId, mesa.id),
            eq(mesaWashes.sessionId, sessionId),
          ),
        );

      if (existingInSession) {
        if (existingInSession.finishedAt) {
          return res.status(400).json({
            message: "Esta mesa ya fue lavada en esta sesión",
            code: "ALREADY_WASHED_IN_SESSION",
          });
        }
        return res.status(400).json({
          message: "Esta mesa ya está en progreso en esta sesión",
          code: "IN_PROGRESS_IN_SESSION",
        });
      }

      // Check if another session is currently washing this mesa
      const [activeWashOtherSession] = await db
        .select()
        .from(mesaWashes)
        .where(
          and(
            eq(mesaWashes.mesaId, mesa.id),
            isNull(mesaWashes.finishedAt),
          ),
        );

      if (activeWashOtherSession && activeWashOtherSession.sessionId !== sessionId) {
        return res.status(400).json({
          message: "Esta mesa la está lavando otro técnico",
          code: "IN_PROGRESS_BY_OTHER",
        });
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
    const { code, sessionId } = req.body;

    try {
      const [mesa] = await db.select().from(mesas).where(eq(mesas.code, code));

      if (!mesa) {
        return res.status(404).json({ message: "Mesa no encontrada" });
      }

      // Buscar el lavado activo de esta mesa EN ESTA SESIÓN
      const [mesaWash] = await db
        .select()
        .from(mesaWashes)
        .where(
          and(
            eq(mesaWashes.mesaId, mesa.id),
            eq(mesaWashes.sessionId, sessionId),
            isNull(mesaWashes.finishedAt),
          ),
        );

      if (!mesaWash) {
        // Check if it's being washed by another session
        const [otherSessionWash] = await db
          .select()
          .from(mesaWashes)
          .where(
            and(
              eq(mesaWashes.mesaId, mesa.id),
              isNull(mesaWashes.finishedAt),
            ),
          );

        if (otherSessionWash) {
          return res.status(400).json({
            message: "Esta mesa la está lavando otro técnico",
            code: "IN_PROGRESS_BY_OTHER",
          });
        }

        // Check if already fully washed in this session
        const [alreadyWashed] = await db
          .select()
          .from(mesaWashes)
          .where(
            and(
              eq(mesaWashes.mesaId, mesa.id),
              eq(mesaWashes.sessionId, sessionId),
            ),
          );

        if (alreadyWashed) {
          return res.status(400).json({
            message: "Esta mesa ya fue lavada en esta sesión",
            code: "ALREADY_WASHED_IN_SESSION",
          });
        }

        return res.status(400).json({
          message: "No hay lavado activo para esta mesa en esta sesión",
          code: "NO_ACTIVE_WASH",
        });
      }

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
