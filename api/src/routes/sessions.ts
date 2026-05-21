import { Router } from "express";
import { db } from "../db/index";
import { washSessions, mesas, mesaWashes, plants, users } from "../db/schema";
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

    if (!plantId) {
      return res.status(400).json({ message: "plantId requerido" });
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
      res.status(500).json({ message: "Error interno del servidor" });
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
      const mesasEnProgreso = await db
        .select()
        .from(mesaWashes)
        .where(eq(mesaWashes.sessionId, sessionId as string));

      const hayMesasEnProgreso = mesasEnProgreso.some((m) => !m.finishedAt);

      if (hayMesasEnProgreso) {
        return res.status(400).json({
          message: "No se puede finalizar una sesión con mesas en progreso",
        });
      }

      const [session] = await db
        .update(washSessions)
        .set({ finishedAt: new Date() })
        .where(eq(washSessions.id, sessionId as string))
        .returning();

      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Error interno del servidor" });
    }
  },
);

router.get(
  "/:plantId",
  requireAuth,
  requireSessionAccess,
  async (req: AuthRequest, res) => {
    const { plantId } = req.params;

    try {
      const sessions = await db
        .select()
        .from(washSessions)
        .where(eq(washSessions.plantId, plantId as string));

      if (!sessions) {
        return res.status(404).json({ message: "Sesión no encontrada" });
      }

      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Error interno del servidor" });
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
      const [result] = await db
        .select({
          session: washSessions,
          plant: {
            id: plants.id,
            name: plants.name,
            location: plants.location,
          },
          technician: {
            id: users.id,
            name: users.name,
          },
        })
        .from(washSessions)
        .innerJoin(plants, eq(washSessions.plantId, plants.id))
        .innerJoin(users, eq(washSessions.technicianId, users.id))
        .where(eq(washSessions.id, sessionId as string));

      if (!result) {
        return res.status(404).json({ message: "Sesión no encontrada" });
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
        .where(eq(mesas.plantId, result.session.plantId));

      const duracionTotal = result.session.finishedAt
        ? Math.floor(
            (new Date(result.session.finishedAt).getTime() -
              new Date(result.session.startedAt!).getTime()) /
              1000,
          )
        : Math.floor(
            (Date.now() - new Date(result.session.startedAt!).getTime()) / 1000,
          );

      res.json({
        session: {
          ...result.session,
          plant: result.plant,
          technician: result.technician,
        },
        mesasLavadas: mesasLavadas.length,
        totalMesas: total,
        porcentaje: Math.round((mesasLavadas.length / total) * 100),
        duracionTotal: duracionTotal as number,
      });
    } catch (error) {
      res.status(500).json({ message: "Error interno del servidor" });
    }
  },
);

export default router;
