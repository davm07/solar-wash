import { Resend } from "resend";
import { db } from "../db/index";
import {
  users,
  plants,
  cleaningCycles,
  washSessions,
  mesaWashes,
} from "../db/schema";
import { eq, and, isNotNull, inArray, sql, gte, lt } from "drizzle-orm";

let resend: Resend | null = null;

function getClient(): Resend | null {
  if (resend) return resend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — emails disabled");
    return null;
  }
  resend = new Resend(apiKey);
  return resend;
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
}

function formatDuration(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (sec > 0 || parts.length === 0) parts.push(`${sec}s`);
  return parts.join(" ");
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Cycle Completion Email ──────────────────────────────────────────────────

export async function sendCycleCompletionEmail(
  cycleId: string,
  overrideEmail?: string,
): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    // 1. Get cycle
    const [cycle] = await db
      .select()
      .from(cleaningCycles)
      .where(eq(cleaningCycles.id, cycleId));
    if (!cycle) return;

    // 2. Get plant + client
    const [plant] = await db
      .select()
      .from(plants)
      .where(eq(plants.id, cycle.plantId));
    if (!plant) return;

    const [clientUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, plant.clientId));
    if (!clientUser) return;

    // 3. Get sessions in this cycle
    const sessions = await db
      .select({
        id: washSessions.id,
        technicianId: washSessions.technicianId,
        startedAt: washSessions.startedAt,
        finishedAt: washSessions.finishedAt,
        waterConsumption: washSessions.waterConsumption,
      })
      .from(washSessions)
      .where(eq(washSessions.cycleId, cycleId));

    const sessionIds = sessions.map((s) => s.id);

    // 4. Technician breakdown
    const techMap = new Map<
      string,
      { name: string; mesasWashed: number; sessionCount: number }
    >();

    for (const session of sessions) {
      const [tech] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.technicianId));

      const existing = techMap.get(session.technicianId) || {
        name: tech?.name || "Desconocido",
        mesasWashed: 0,
        sessionCount: 0,
      };
      existing.sessionCount++;

      // Count finished mesaWashes for this session
      const [{ count: mesasDone }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(mesaWashes)
        .where(
          and(
            eq(mesaWashes.sessionId, session.id),
            isNotNull(mesaWashes.finishedAt),
          ),
        );
      existing.mesasWashed += Number(mesasDone) || 0;

      techMap.set(session.technicianId, existing);
    }

    // 5. Water consumption + total mesas
    let totalWater = 0;
    let totalMesas = 0;
    for (const s of sessions) {
      totalWater += s.waterConsumption || 0;
    }
    for (const t of techMap.values()) {
      totalMesas += t.mesasWashed;
    }

    // 6. Session duration
    let sessionDuration = 0;
    for (const s of sessions) {
      if (s.startedAt && s.finishedAt) {
        sessionDuration +=
          (new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()) /
          1000;
      }
    }

    // 7. Build HTML
    const techRows = Array.from(techMap.values())
      .map(
        (t) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${t.name}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${t.sessionCount}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${t.mesasWashed}</td>
        </tr>`,
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:sans-serif;background:#f5f5f5;padding:20px;">
        <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <h1 style="color:#1D9E75;margin:0 0 8px;">Ciclo de lavado completado</h1>
          <p style="color:#888;margin:0 0 24px;">${plant.name}</p>

          <div style="display:flex;gap:16px;margin-bottom:24px;flex-direction:row;">
            <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
              <div style="font-size:24px;font-weight:bold;color:#1D9E75;">${totalMesas.toLocaleString()}</div>
              <div style="color:#666;font-size:13px;">Mesas lavadas</div>
            </div>
            <div style="flex:1;background:#eff6ff;border-radius:8px;padding:16px;text-align:center;">
              <div style="font-size:24px;font-weight:bold;color:#2563eb;">${sessions.length}</div>
              <div style="color:#666;font-size:13px;">Sesiones</div>
            </div>
            <div style="flex:1;background:#fefce8;border-radius:8px;padding:16px;text-align:center;">
              <div style="font-size:24px;font-weight:bold;color:#ca8a04;">${totalWater > 0 ? `${totalWater} m³` : "—"}</div>
              <div style="color:#666;font-size:13px;">Agua consumida</div>
            </div>
          </div>

          <div style="margin-bottom:24px;">
            <div style="color:#888;font-size:13px;margin-bottom:4px;">Inicio</div>
            <div style="font-size:15px;">${formatDate(cycle.startedAt)}</div>
          </div>
          <div style="margin-bottom:24px;">
            <div style="color:#888;font-size:13px;margin-bottom:4px;">Finalización</div>
            <div style="font-size:15px;">${formatDate(cycle.finishedAt)}</div>
          </div>
          <div style="margin-bottom:24px;">
            <div style="color:#888;font-size:13px;margin-bottom:4px;">Duración total</div>
            <div style="font-size:15px;">${formatDuration(sessionDuration)}</div>
          </div>

          ${
            techRows
              ? `
          <h2 style="font-size:16px;margin:24px 0 12px;">Técnicos participantes</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;">Nombre</th>
                <th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb;">Sesiones</th>
                <th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb;">Mesas</th>
              </tr>
            </thead>
            <tbody>${techRows}</tbody>
          </table>`
              : ""
          }

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
          <p style="color:#aaa;font-size:12px;text-align:center;">
            Solar Wash — Sistema de gestión de lavado de paneles solares
          </p>
        </div>
      </body>
      </html>`;

    // 8. Send
    const recipient = overrideEmail || clientUser.email;
    const { error } = await client.emails.send({
      from: `Solar Wash <${getFromEmail()}>`,
      to: [recipient],
      subject: `Ciclo de lavado completado — ${plant.name}`,
      html,
    });

    if (error) {
      console.error("Error sending cycle completion email:", error);
    } else {
      console.log(`Cycle completion email sent to ${recipient}`);
    }
  } catch (err) {
    console.error("Failed to send cycle completion email:", err);
  }
}

// ── Weekly Summary Email ────────────────────────────────────────────────────

interface WeeklyPlantSummary {
  plantId: string;
  plantName: string;
  sessionCount: number;
  mesasWashed: number;
  totalWater: number;
  technicianNames: string[];
}

export async function sendWeeklySummaryEmails(
  overrideEmail?: string,
): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    // 1. Define week range (Monday 00:00 → Sunday 23:59)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    // 2. Query sessions finished this week
    const sessionsThisWeek = await db
      .select({
        sessionId: washSessions.id,
        plantId: washSessions.plantId,
        plantName: plants.name,
        clientId: plants.clientId,
        technicianId: washSessions.technicianId,
        waterConsumption: washSessions.waterConsumption,
      })
      .from(washSessions)
      .innerJoin(plants, eq(washSessions.plantId, plants.id))
      .where(
        and(
          isNotNull(washSessions.finishedAt),
          gte(washSessions.finishedAt, startOfWeek),
          lt(washSessions.finishedAt, endOfWeek),
        ),
      );

    if (sessionsThisWeek.length === 0) {
      console.log("No sessions finished this week — skipping weekly summary");
      return;
    }

    // 3. Batch: mesa counts per session
    const sessionIds = sessionsThisWeek.map((s) => s.sessionId);
    const mesaCountRows = await db
      .select({
        sessionId: mesaWashes.sessionId,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(mesaWashes)
      .where(
        and(
          inArray(mesaWashes.sessionId, sessionIds),
          isNotNull(mesaWashes.finishedAt),
        ),
      )
      .groupBy(mesaWashes.sessionId);

    const mesaCountBySession = new Map<string, number>();
    for (const row of mesaCountRows) {
      mesaCountBySession.set(row.sessionId, row.count);
    }

    // 4. Batch: technician names
    const techIds = [...new Set(sessionsThisWeek.map((s) => s.technicianId))];
    const techRows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, techIds));

    const techNameById = new Map<string, string>();
    for (const t of techRows) {
      techNameById.set(t.id, t.name);
    }

    // 5. Group by plant
    const plantMap = new Map<string, WeeklyPlantSummary>();
    for (const s of sessionsThisWeek) {
      let plant = plantMap.get(s.plantId);
      if (!plant) {
        plant = {
          plantId: s.plantId,
          plantName: s.plantName,
          sessionCount: 0,
          mesasWashed: 0,
          totalWater: 0,
          technicianNames: [],
        };
        plantMap.set(s.plantId, plant);
      }
      plant.sessionCount++;
      plant.mesasWashed += mesaCountBySession.get(s.sessionId) || 0;
      plant.totalWater += s.waterConsumption || 0;

      const techName = techNameById.get(s.technicianId) || "Desconocido";
      if (!plant.technicianNames.includes(techName)) {
        plant.technicianNames.push(techName);
      }
    }

    // 6. Find all admins
    const admins = await db.select().from(users).where(eq(users.role, "admin"));

    // 7. Find all technicians who worked this week
    const workingTechs = await db
      .selectDistinct({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .innerJoin(washSessions, eq(washSessions.technicianId, users.id))
      .where(
        and(
          eq(users.role, "technician"),
          gte(washSessions.startedAt, startOfWeek),
          lt(washSessions.startedAt, endOfWeek),
        ),
      );

    // 8. Build recipient list
    const recipients = new Map<string, string>(); // email → name

    if (overrideEmail) {
      recipients.set(overrideEmail, "Test User");
    } else {
      // Clients who had sessions this week
      const clientIds = new Set(sessionsThisWeek.map((s) => s.clientId));
      for (const cid of clientIds) {
        const [u] = await db.select().from(users).where(eq(users.id, cid));
        if (u) recipients.set(u.email, u.name);
      }
      // Admins
      for (const a of admins) {
        recipients.set(a.email, a.name);
      }
      // Technicians
      for (const t of workingTechs) {
        recipients.set(t.email, t.name);
      }
    }

    if (recipients.size === 0) {
      console.log("No recipients for weekly summary");
      return;
    }

    // 9. Build HTML
    const weekStart = formatDateShort(startOfWeek);
    const weekEnd = formatDateShort(endOfWeek);

    const plantSummaries = Array.from(plantMap.values());
    let totalSessions = 0;
    let totalMesas = 0;
    let totalWaterAll = 0;

    const plantRows = plantSummaries
      .map((p) => {
        totalSessions += p.sessionCount;
        totalMesas += p.mesasWashed;
        totalWaterAll += p.totalWater;
        return `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${p.plantName}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${p.sessionCount}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${p.mesasWashed.toLocaleString()}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${p.totalWater > 0 ? `${p.totalWater} m³` : "—"}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${p.technicianNames.join(", ")}</td>
          </tr>`;
      })
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:sans-serif;background:#f5f5f5;padding:20px;">
        <div style="max-width:700px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <h1 style="color:#1D9E75;margin:0 0 8px;">Resumen semanal</h1>
          <p style="color:#888;margin:0 0 24px;">Semana del ${weekStart} — ${weekEnd}</p>

          <div style="display:flex;gap:16px;margin-bottom:24px;">
            <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
              <div style="font-size:24px;font-weight:bold;color:#1D9E75;">${totalSessions}</div>
              <div style="color:#666;font-size:13px;">Sesiones completadas</div>
            </div>
            <div style="flex:1;background:#eff6ff;border-radius:8px;padding:16px;text-align:center;">
              <div style="font-size:24px;font-weight:bold;color:#2563eb;">${totalMesas.toLocaleString()}</div>
              <div style="color:#666;font-size:13px;">Mesas lavadas</div>
            </div>
            <div style="flex:1;background:#fefce8;border-radius:8px;padding:16px;text-align:center;">
              <div style="font-size:24px;font-weight:bold;color:#ca8a04;">${totalWaterAll > 0 ? `${totalWaterAll} m³` : "—"}</div>
              <div style="color:#666;font-size:13px;">Agua total</div>
            </div>
          </div>

          ${
            plantRows
              ? `
          <h2 style="font-size:16px;margin:24px 0 12px;">Detalle por planta</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;">Planta</th>
                <th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb;">Sesiones</th>
                <th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb;">Mesas</th>
                <th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb;">Agua</th>
                <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;">Técnicos</th>
              </tr>
            </thead>
            <tbody>${plantRows}</tbody>
          </table>`
              : ""
          }

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
          <p style="color:#aaa;font-size:12px;text-align:center;">
            Solar Wash — Sistema de gestión de lavado de paneles solares
          </p>
        </div>
      </body>
      </html>`;

    // 10. Send to all recipients
    const emailList = Array.from(recipients.keys());
    const { error } = await client.emails.send({
      from: `Solar Wash <${getFromEmail()}>`,
      to: emailList,
      subject: `Resumen semanal — Semana del ${weekStart}`,
      html,
    });

    if (error) {
      console.error("Error sending weekly summary:", error);
    } else {
      console.log(
        `Weekly summary sent to ${emailList.length} recipient(s): ${emailList.join(", ")}`,
      );
    }
  } catch (err) {
    console.error("Failed to send weekly summary:", err);
  }
}
