import { useState } from "react";
import { useSessions } from "../hooks/useSessions";
import { useNavigate } from "react-router-dom";
import formatDuration from "../utils/formatDuration";

interface Plant {
  id: number;
  name: string;
  location: string;
  client?: string;
}

export default function PlantCard({ plant }: { plant: Plant }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data: sessions, isLoading, isError } = useSessions(plant.id, open);

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
                  {getSessionDate(session.startedAt, session.finishedAt)}
                </span>
                <span className="text-sm text-gray-500">
                  {getSessionDuration(
                    session.startedAt,
                    session.finishedAt,
                  )}{" "}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
