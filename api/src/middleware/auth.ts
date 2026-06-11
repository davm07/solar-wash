import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db/index";
import { plants, washSessions, cleaningCycles } from "../db/schema";
import { eq } from "drizzle-orm";

export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token proporcionado" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      role: string;
    };
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

export function requireTechnician(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  if (req.user!.role !== "technician" && req.user!.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Solo técnicos pueden realizar esta acción" });
  }
  next();
}

export async function requirePlantAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  if (req.user!.role === "technician" || req.user!.role === "admin") {
    return next();
  }

  try {
    const plantId = req.params.plantId;
    const [plant] = await db
      .select()
      .from(plants)
      .where(eq(plants.id, plantId as string));

    if (!plant || plant.clientId !== req.user!.id) {
      return res.status(403).json({ error: "No tienes acceso a esta planta" });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function requireSessionAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  if (req.user!.role === "technician" || req.user!.role === "admin") {
    return next();
  }

  try {
    let session: typeof washSessions.$inferSelect | undefined;
    if (req.params.plantId) {
      const [foundSession] = await db
        .select()
        .from(washSessions)
        .where(eq(washSessions.plantId, req.params.plantId as string));
      session = foundSession;
    }
    if (req.params.sessionId) {
      const [foundSession] = await db
        .select()
        .from(washSessions)
        .where(eq(washSessions.id, req.params.sessionId as string));

      session = foundSession;
    }

    if (!session) {
      return res.status(404).json({ error: "Sesión no encontrada" });
    }

    const [plant] = await db
      .select()
      .from(plants)
      .where(eq(plants.id, session.plantId));

    if (!plant || plant.clientId !== req.user!.id) {
      return res.status(403).json({ error: "No tienes acceso a esta sesión" });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function requireCycleAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  if (req.user!.role === "technician" || req.user!.role === "admin") {
    return next();
  }

  try {
    const cycleId = req.params.cycleId;
    const [cycle] = await db
      .select()
      .from(cleaningCycles)
      .where(eq(cleaningCycles.id, cycleId as string));

    if (!cycle) {
      return res.status(404).json({ error: "Ciclo no encontrado" });
    }

    const [plant] = await db
      .select()
      .from(plants)
      .where(eq(plants.id, cycle.plantId));

    if (!plant || plant.clientId !== req.user!.id) {
      return res.status(403).json({ error: "No tienes acceso a este ciclo" });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
}
