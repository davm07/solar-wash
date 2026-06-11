import { Router } from "express";
import { db } from "../db/index";
import {
  washSessions,
  mesas,
  mesaWashes,
  plants,
  users,
  cleaningCycles,
} from "../db/schema";
import { eq, count, and, isNull, isNotNull, inArray, sql } from "drizzle-orm";
import {
  requireAuth,
  AuthRequest,
  requireTechnician,
  requireSessionAccess,
  requireCycleAccess,
} from "../middleware/auth";
import { supabase } from "../lib/supabase";

const router = Router();

// ============================
// INICIAR SESIÓN (find/create cycle)
// ============================
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
      // Find active cycle for this plant (no finishedAt)
      let [activeCycle] = await db
        .select()
        .from(cleaningCycles)
        .where(
          and(
            eq(cleaningCycles.plantId, plantId),
            isNull(cleaningCycles.finishedAt),
          ),
        );

      // If no active cycle, create one
      if (!activeCycle) {
        [activeCycle] = await db
          .insert(cleaningCycles)
          .values({ plantId })
          .returning();
      }

      // Create session linked to the cycle
      const [session] = await db
        .insert(washSessions)
        .values({
          plantId,
          technicianId: req.user!.id,
          cycleId: activeCycle.id,
        })
        .returning();

      res.json(session);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  },
);

// ============================
// FINALIZAR SESIÓN
// ============================
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

// ============================
// LISTAR SESIONES POR PLANTA
// ============================
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

// ============================
// OBTENER CICLO ACTIVO DE UNA PLANTA
// ============================
router.get(
  "/cycles/active/:plantId",
  requireAuth,
  requireSessionAccess,
  async (req: AuthRequest, res) => {
    const { plantId } = req.params;

    try {
      // Find active cycle
      const [cycle] = await db
        .select()
        .from(cleaningCycles)
        .where(
          and(
            eq(cleaningCycles.plantId, plantId as string),
            isNull(cleaningCycles.finishedAt),
          ),
        );

      if (!cycle) {
        return res.json({
          cycle: null,
          mesasDone: 0,
          totalMesas: 0,
          percentage: 0,
          sessionCount: 0,
          technicianCount: 0,
        });
      }

      // Get all sessions in this cycle
      const cycleSessions = await db
        .select({ id: washSessions.id })
        .from(washSessions)
        .where(eq(washSessions.cycleId, cycle.id));

      const sessionIds = cycleSessions.map((s) => s.id);

      // Count mesas done across all sessions in this cycle
      let mesasDone = 0;
      if (sessionIds.length > 0) {
        const [result] = await db
          .select({ count: count() })
          .from(mesaWashes)
          .where(
            and(
              inArray(mesaWashes.sessionId, sessionIds),
              isNotNull(mesaWashes.finishedAt),
            ),
          );
        mesasDone = result.count;
      }

      // Total mesas for this plant
      const [{ total: totalMesas }] = await db
        .select({ total: count() })
        .from(mesas)
        .where(eq(mesas.plantId, plantId as string));

      // Count unique technicians in this cycle
      const technicians = await db
        .select({ technicianId: washSessions.technicianId })
        .from(washSessions)
        .where(eq(washSessions.cycleId, cycle.id))
        .groupBy(washSessions.technicianId);

      res.json({
        cycle,
        mesasDone,
        totalMesas,
        percentage: totalMesas > 0 ? Math.round((mesasDone / totalMesas) * 100) : 0,
        sessionCount: cycleSessions.length,
        technicianCount: technicians.length,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  },
);

// ============================
// LISTAR TODOS LOS CICLOS DE UNA PLANTA
// ============================
router.get(
  "/cycles/list/:plantId",
  requireAuth,
  requireSessionAccess,
  async (req: AuthRequest, res) => {
    const { plantId } = req.params;

    try {
      const cycles = await db
        .select()
        .from(cleaningCycles)
        .where(eq(cleaningCycles.plantId, plantId as string));

      // Get total mesas for this plant
      const [{ total: totalMesas }] = await db
        .select({ total: count() })
        .from(mesas)
        .where(eq(mesas.plantId, plantId as string));

      // For each cycle, compute progress
      const cyclesWithProgress = await Promise.all(
        cycles.map(async (cycle) => {
          const cycleSessions = await db
            .select({ id: washSessions.id })
            .from(washSessions)
            .where(eq(washSessions.cycleId, cycle.id));

          const sessionIds = cycleSessions.map((s) => s.id);

          let mesasDone = 0;
          if (sessionIds.length > 0) {
            const [result] = await db
              .select({ count: count() })
              .from(mesaWashes)
              .where(
                and(
                  inArray(mesaWashes.sessionId, sessionIds),
                  isNotNull(mesaWashes.finishedAt),
                ),
              );
            mesasDone = result.count;
          }

          const technicians = await db
            .select({ technicianId: washSessions.technicianId })
            .from(washSessions)
            .where(eq(washSessions.cycleId, cycle.id))
            .groupBy(washSessions.technicianId);

          return {
            ...cycle,
            mesasDone,
            totalMesas,
            percentage:
              totalMesas > 0
                ? Math.round((mesasDone / totalMesas) * 100)
                : 0,
            sessionCount: cycleSessions.length,
            technicianCount: technicians.length,
          };
        }),
      );

      res.json(cyclesWithProgress);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  },
);

// ============================
// RESUMEN DE UN CICLO ESPECÍFICO
// ============================
router.get(
  "/cycles/:cycleId/summary",
  requireAuth,
  requireCycleAccess,
  async (req: AuthRequest, res) => {
    const { cycleId } = req.params;

    try {
      const [cycle] = await db
        .select()
        .from(cleaningCycles)
        .where(eq(cleaningCycles.id, cycleId as string));

      if (!cycle) {
        return res.status(404).json({ message: "Ciclo no encontrado" });
      }

      // Get all sessions in this cycle with technician info
      const cycleSessions = await db
        .select({
          id: washSessions.id,
          technicianId: washSessions.technicianId,
          startedAt: washSessions.startedAt,
          finishedAt: washSessions.finishedAt,
          technicianName: users.name,
        })
        .from(washSessions)
        .innerJoin(users, eq(washSessions.technicianId, users.id))
        .where(eq(washSessions.cycleId, cycleId as string));

      const sessionIds = cycleSessions.map((s) => s.id);

      // Count mesas done across all sessions
      let mesasDone = 0;
      if (sessionIds.length > 0) {
        const [result] = await db
          .select({ count: count() })
          .from(mesaWashes)
          .where(
            and(
              inArray(mesaWashes.sessionId, sessionIds),
              isNotNull(mesaWashes.finishedAt),
            ),
          );
        mesasDone = result.count;
      }

      // Total mesas
      const [{ total: totalMesas }] = await db
        .select({ total: count() })
        .from(mesas)
        .where(eq(mesas.plantId, cycle.plantId));

      // Get mesas washed per session
      const sessionsWithDetails = await Promise.all(
        cycleSessions.map(async (session) => {
          const [{ done }] = await db
            .select({ done: count() })
            .from(mesaWashes)
            .where(
              and(
                eq(mesaWashes.sessionId, session.id),
                isNotNull(mesaWashes.finishedAt),
              ),
            );

          return {
            ...session,
            mesasWashed: done,
          };
        }),
      );

      // Technician breakdown
      const technicianBreakdown = await Promise.all(
        (
          await db
            .select({ technicianId: washSessions.technicianId })
            .from(washSessions)
            .where(eq(washSessions.cycleId, cycleId as string))
            .groupBy(washSessions.technicianId)
        ).map(async (t) => {
          const techSessions = cycleSessions.filter(
            (s) => s.technicianId === t.technicianId,
          );
          const techSessionIds = techSessions.map((s) => s.id);

          let mesasWashed = 0;
          if (techSessionIds.length > 0) {
            const [result] = await db
              .select({ count: count() })
              .from(mesaWashes)
              .where(
                and(
                  inArray(mesaWashes.sessionId, techSessionIds),
                  isNotNull(mesaWashes.finishedAt),
                ),
              );
            mesasWashed = result.count;
          }

          const techName = techSessions[0]?.technicianName ?? "Unknown";

          return {
            id: t.technicianId,
            name: techName,
            mesasWashed,
            sessionCount: techSessions.length,
          };
        }),
      );

      // Get per-mesa status across all sessions in this cycle
      let mesasCycle: { code: string; status: string }[] = [];
      if (sessionIds.length > 0) {
        const allWashes = await db
          .select({
            mesaId: mesaWashes.mesaId,
            finishedAt: mesaWashes.finishedAt,
          })
          .from(mesaWashes)
          .where(inArray(mesaWashes.sessionId, sessionIds));

        const mesaStatusMap = new Map<string, string>();
        for (const wash of allWashes) {
          const current = mesaStatusMap.get(wash.mesaId);
          if (wash.finishedAt) {
            mesaStatusMap.set(wash.mesaId, "done");
          } else if (current !== "done") {
            mesaStatusMap.set(wash.mesaId, "in_progress");
          }
        }

        const mesaIds = Array.from(mesaStatusMap.keys());
        if (mesaIds.length > 0) {
          const mesaRows = await db
            .select({ id: mesas.id, code: mesas.code })
            .from(mesas)
            .where(inArray(mesas.id, mesaIds));

          mesasCycle = mesaRows.map((m) => ({
            code: m.code,
            status: mesaStatusMap.get(m.id) ?? "pending",
          }));
        }
      }

      // Calculate session duration (sum of finishedAt - startedAt)
      let sessionDuration = 0;
      if (sessionIds.length > 0) {
        const [result] = await db
          .select({
            total: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (${washSessions.finishedAt} - ${washSessions.startedAt}))), 0)`,
          })
          .from(washSessions)
          .where(
            and(
              inArray(washSessions.id, sessionIds),
              isNotNull(washSessions.finishedAt),
            ),
          );
        sessionDuration = Number(result.total) || 0;
      }

      // Calculate washing duration (sum of durationSeconds from mesaWashes)
      let washingDuration = 0;
      if (sessionIds.length > 0) {
        const [result] = await db
          .select({
            total: sql<number>`COALESCE(SUM(${mesaWashes.durationSeconds}), 0)`,
          })
          .from(mesaWashes)
          .where(inArray(mesaWashes.sessionId, sessionIds));
        washingDuration = Number(result.total) || 0;
      }

      // Get plant SVG
      const [plant] = await db
        .select({ svgPath: plants.svgPath })
        .from(plants)
        .where(eq(plants.id, cycle.plantId));

      let svgContent: string | null = null;
      if (plant?.svgPath) {
        const { data, error } = await supabase.storage
          .from("plantas")
          .download(plant.svgPath);

        if (error) {
          console.error("Error descargando el SVG:", error);
        }

        svgContent = data ? await data.text() : null;
      }

      res.json({
        cycle,
        mesasDone,
        totalMesas,
        percentage:
          totalMesas > 0 ? Math.round((mesasDone / totalMesas) * 100) : 0,
        sessions: sessionsWithDetails,
        technicians: technicianBreakdown,
        svgContent,
        mesasCycle,
        sessionDuration,
        washingDuration,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  },
);

// ============================
// FINALIZAR CICLO
// ============================
router.post(
  "/cycles/:cycleId/finish",
  requireAuth,
  requireTechnician,
  async (req: AuthRequest, res) => {
    const { cycleId } = req.params;

    try {
      const [cycle] = await db
        .update(cleaningCycles)
        .set({ finishedAt: new Date() })
        .where(eq(cleaningCycles.id, cycleId as string))
        .returning();

      res.json(cycle);
    } catch (error) {
      res.status(500).json({ message: "Error interno del servidor" });
    }
  },
);

// ============================
// RESUMEN DE SESIÓN (with cycle progress)
// ============================
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
            svgPath: plants.svgPath,
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

      const mesasPlanta = await db
        .select({ code: mesas.code, label: mesas.label, status: mesas.status })
        .from(mesas)
        .where(eq(mesas.plantId, result.session.plantId));

      // Mesas lavadas en esta sesión (session-scoped status)
      const mesasLavadas = await db
        .select()
        .from(mesaWashes)
        .where(eq(mesaWashes.sessionId, sessionId as string));

      // Get mesa codes for washed mesas
      const washedMesaIds = mesasLavadas.map((mw) => mw.mesaId);
      const washedMesas =
        washedMesaIds.length > 0
          ? await db
              .select({ id: mesas.id, code: mesas.code })
              .from(mesas)
              .where(inArray(mesas.id, washedMesaIds))
          : [];

      const mesasSession = mesasLavadas.map((mw) => {
        const mesa = washedMesas.find((m) => m.id === mw.mesaId);
        return {
          code: mesa?.code ?? "",
          status: mw.finishedAt ? "done" : "in_progress",
        };
      });

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
            (Date.now() - new Date(result.session.startedAt!).getTime()) /
              1000,
          );

      // Cycle progress (if session belongs to a cycle)
      let cycleProgress = null;
      if (result.session.cycleId) {
        const [cycle] = await db
          .select()
          .from(cleaningCycles)
          .where(eq(cleaningCycles.id, result.session.cycleId));

        if (cycle) {
          const cycleSessions = await db
            .select({ id: washSessions.id })
            .from(washSessions)
            .where(eq(washSessions.cycleId, cycle.id));

          const sessionIds = cycleSessions.map((s) => s.id);

          let cycleMesasDone = 0;
          if (sessionIds.length > 0) {
            const [r] = await db
              .select({ count: count() })
              .from(mesaWashes)
              .where(
                and(
                  inArray(mesaWashes.sessionId, sessionIds),
                  isNotNull(mesaWashes.finishedAt),
                ),
              );
            cycleMesasDone = r.count;
          }

          cycleProgress = {
            cycleId: cycle.id,
            startedAt: cycle.startedAt,
            finishedAt: cycle.finishedAt,
            mesasDone: cycleMesasDone,
            totalMesas: total,
            percentage:
              total > 0 ? Math.round((cycleMesasDone / total) * 100) : 0,
          };
        }
      }

      const { data, error } = await supabase.storage
        .from("plantas")
        .download(result.plant.svgPath!);

      if (error) {
        console.error("Error descargando el SVG:", error);
      }

      const svgContent = data ? await data.text() : null;

      const plantWithSvg = {
        ...result.plant,
        svgContent,
      };

      res.json({
        session: {
          ...result.session,
          plant: plantWithSvg,
          technician: result.technician,
        },
        mesasLavadas: mesasLavadas.length,
        totalMesas: total,
        porcentaje: Math.round((mesasLavadas.length / total) * 100),
        duracionTotal: duracionTotal as number,
        mesasSession,
        cycleProgress,
      });
    } catch (error) {
      res.status(500).json({ message: "Error interno del servidor" });
    }
  },
);

export default router;
