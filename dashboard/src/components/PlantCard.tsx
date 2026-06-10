import { useState } from "react";
import { useSessions } from "../hooks/useSessions";
import { useActiveCycle } from "../hooks/useActiveCycle";
import { useCycleHistory } from "../hooks/useCycleHistory";
import { useNavigate } from "react-router-dom";
import formatDuration from "../utils/formatDuration";

interface Plant {
  id: string;
  name: string;
  location: string;
  client?: string;
}

export default function PlantCard({ plant }: { plant: Plant }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data: sessions, isLoading, isError } = useSessions(plant.id, open);
  const { data: cycleData } = useActiveCycle(plant.id);
  const { data: cycleHistory } = useCycleHistory(plant.id);

  const getSessionDate = (startDate: string, endDate: string) => {
    const newStartDate = new Date(startDate);
    const newEndDate = new Date(endDate);

    const dayStart = newStartDate.getDate();
    const dayEnd = newEndDate.getDate();
    const monthStart = newStartDate.getMonth();
    const monthEnd = newEndDate.getMonth();
    const yearStart = newStartDate.getFullYear();
    const yearEnd = newEndDate.getFullYear();

    if (dayStart === dayEnd) {
      return `${dayStart}/${monthStart + 1}/${yearStart}`;
    }
    return `${dayStart}/${monthStart + 1}/${yearStart} - ${dayEnd}/${monthEnd + 1}/${yearEnd}`;
  };

  const getCycleDate = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate);
    const startStr = `${start.getDate()}/${start.getMonth() + 1}/${start.getFullYear()}`;

    if (!endDate) return `${startStr} - En curso`;

    const end = new Date(endDate);
    const endStr = `${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
    return `${startStr} - ${endStr}`;
  };

  const getSessionDuration = (startDate: string, endDate: string) => {
    const newStartDate = new Date(startDate);
    const newEndDate = new Date(endDate);

    const diffInMs = Math.floor(
      (newEndDate.getTime() - newStartDate.getTime()) / 1000,
    );
    const diffInMins = formatDuration(diffInMs);

    return diffInMins;
  };

  const toggle = () => setOpen((prev) => !prev);

  // Separate active and finished cycles
  const finishedCycles =
    cycleHistory?.filter((c) => c.finishedAt !== null) ?? [];

  return (
    <div className="bg-olive-50 border border-olive-200 rounded-xl p-4 shadow-sm mb-4 max-w-md">
      {/* PLANT HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">{plant.name}</h3>
          <p className="text-sm text-gray-500">{plant.location}</p>
          {plant.client && (
            <p className="text-xs text-gray-400">Cliente: {plant.client}</p>
          )}
        </div>

        <button
          onClick={toggle}
          className="text-sm bg-olive-200 px-3 py-1 rounded hover:bg-olive-300"
        >
          {open ? "Esconder sesiones de lavado" : "Ver sesiones de lavado"}
        </button>
      </div>

      {/* ACTIVE CYCLE PROGRESS */}
      {cycleData?.cycle && (
        <div className="mt-3 p-3 bg-white rounded-lg border border-olive-100">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">
              Ciclo activo
            </span>
            <span className="text-sm font-bold text-olive-700">
              {cycleData.mesasDone}/{cycleData.totalMesas} (
              {cycleData.percentage}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-green-700 h-full transition-all"
              style={{ width: `${cycleData.percentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Sesiones: {cycleData.sessionCount}</span>
            <span>Técnicos: {cycleData.technicianCount}</span>
          </div>
        </div>
      )}

      {/* FINISHED CYCLES */}
      {finishedCycles.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-500 mb-2">
            Ciclos anteriores
          </p>
          {finishedCycles.map((cycle) => (
            <div
              key={cycle.id}
              onClick={() => navigate(`/cycles/${cycle.id}`)}
              className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 mb-1 hover:bg-gray-50 cursor-pointer"
            >
              <div className="text-xs">
                <p className="text-gray-700">
                  {getCycleDate(cycle.startedAt, cycle.finishedAt)}
                </p>
                <p className="text-gray-400">
                  {cycle.sessionCount} sesiones · {cycle.technicianCount}{" "}
                  técnicos
                </p>
              </div>
              <span className="text-xs font-bold text-green-700">
                {cycle.percentage}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* SESSIONS */}
      {open && (
        <div className="mt-4 border-t pt-3">
          {isLoading && (
            <p className="text-sm text-gray-500">Cargando las sesiones...</p>
          )}

          {isError && (
            <p className="text-sm text-red-500">Error al cargar las sesiones</p>
          )}

          {sessions?.length === 0 && (
            <p className="text-sm text-gray-500">No hay sesiones</p>
          )}

          {Array.isArray(sessions) &&
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => navigate(`/sessions/${session.id}`)}
                className="flex justify-between p-2 hover:bg-olive-100 rounded cursor-pointer"
              >
                <span>
                  {session.finishedAt
                    ? getSessionDate(session.startedAt, session.finishedAt)
                    : "Sesión en curso"}
                </span>
                <span className="text-sm text-gray-500">
                  {session.finishedAt
                    ? getSessionDuration(session.startedAt, session.finishedAt)
                    : ""}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
