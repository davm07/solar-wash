import { Router } from "express";
import { db } from "../db/index";
import { washSessions, mesas, mesaWashes } from "../db/schema";
import { eq, count } from "drizzle-orm";
import {
  requireAuth,
  AuthRequest,
  requireTechnician,
  requireSessionAccess,
} from "../middleware/auth";

const router = Router();

// Iniciar una sesión de lavado
// nota un cliente podria iniciar la sesion, es decir esto es un error hay que corregirlo, solo un tecnico puede iniciar la sesion, hay que validar el rol del usuario
router.post(
  "/start",
  requireAuth,
  requireTechnician,
  async (req: AuthRequest, res) => {
    const { plantId } = req.body;
    console.log(plantId);
    console.log(req.user);

    if (!plantId) {
      return res.status(400).json({ error: "plantId requerido" });
    }

    try {
      const [session] = await db
        .insert(washSessions)
        .values({
          plantId,
          technicianId: req.user!.id,
        })
        .returning();

      res.json(session);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },
);

// Finalizar una sesión de lavado
router.post(
  "/:sessionId/finish",
  requireAuth,
  requireTechnician,
  async (req: AuthRequest, res) => {
    const { sessionId } = req.params;

    try {
      const [session] = await db
        .update(washSessions)
        .set({ finishedAt: new Date() })
        .where(eq(washSessions.id, sessionId as string))
        .returning();

      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },
);

// Obtener resumen de una sesión
router.get(
  "/:sessionId/summary",
  requireAuth,
  requireSessionAccess,
  async (req: AuthRequest, res) => {
    const { sessionId } = req.params;

    try {
      const [session] = await db
        .select()
        .from(washSessions)
        .where(eq(washSessions.id, sessionId as string));

      if (!session) {
        return res.status(404).json({ error: "Sesión no encontrada" });
      }

      // Mesas lavadas en esta sesión
      const mesasLavadas = await db
        .select()
        .from(mesaWashes)
        .where(eq(mesaWashes.sessionId, sessionId as string));

      // Total de mesas de la planta
      const [{ total }] = await db
        .select({ total: count() })
        .from(mesas)
        .where(eq(mesas.plantId, session.plantId));

      const duracionTotal = session.finishedAt
        ? Math.floor(
            (new Date(session.finishedAt).getTime() -
              new Date(session.startedAt!).getTime()) /
              1000,
          )
        : Math.floor(
            (Date.now() - new Date(session.startedAt!).getTime()) / 1000,
          );

      res.json({
        session,
        mesasLavadas: mesasLavadas.length,
        totalMesas: total,
        porcentaje: Math.round((mesasLavadas.length / total) * 100),
        duracionSegundos: duracionTotal,
      });
    } catch (error) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },
);

export default router;
