import { useActiveCycle } from "../hooks/useActiveCycle";
import { useCycleHistory } from "../hooks/useCycleHistory";
import { useNavigate } from "react-router-dom";

interface Plant {
  id: string;
  name: string;
  location: string;
  client?: string;
}

export default function PlantCard({ plant }: { plant: Plant }) {
  const navigate = useNavigate();

  const { data: cycleData } = useActiveCycle(plant.id);
  const { data: cycleHistory } = useCycleHistory(plant.id);

  const getCycleDate = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate);
    const startStr = `${start.getDate()}/${start.getMonth() + 1}/${start.getFullYear()}`;

    if (!endDate) return `${startStr} - En curso`;

    const end = new Date(endDate);
    const endStr = `${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
    return `${startStr} - ${endStr}`;
  };

  // Separate active and finished cycles
  const finishedCycles =
    cycleHistory?.filter((c) => c.finishedAt !== null) ?? [];

  const hasActiveCycle = !!cycleData?.cycle;
  const hasFinishedCycles = finishedCycles.length > 0;

  return (
    <div className="bg-olive-50 border border-olive-200 rounded-xl p-4 shadow-sm mb-4 max-w-md">
      {/* PLANT HEADER */}
      <div>
        <h3 className="text-lg font-semibold">{plant.name}</h3>
        <p className="text-sm text-gray-500">{plant.location}</p>
        {plant.client && (
          <p className="text-xs text-gray-400">Cliente: {plant.client}</p>
        )}
      </div>

      {/* ACTIVE CYCLE PROGRESS */}
      {hasActiveCycle && (
        <div
          onClick={() => navigate(`/cycles/${cycleData!.cycle!.id}`)}
          className="mt-3 p-3 bg-white rounded-lg border border-olive-100 hover:bg-gray-50 cursor-pointer"
        >
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">
              Ciclo activo
            </span>
            <span className="text-sm font-bold text-olive-700">
              {cycleData!.mesasDone}/{cycleData!.totalMesas} (
              {cycleData!.percentage}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-green-700 h-full transition-all"
              style={{ width: `${cycleData!.percentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Sesiones: {cycleData!.sessionCount}</span>
            <span>Técnicos: {cycleData!.technicianCount}</span>
          </div>
        </div>
      )}

      {/* FINISHED CYCLES */}
      {hasFinishedCycles && (
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

      {/* NO CYCLES MESSAGE */}
      {!hasActiveCycle && !hasFinishedCycles && (
        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-100 text-center">
          <p className="text-sm text-gray-500">
            No hay ciclos ni sesiones asignadas a esta planta
          </p>
        </div>
      )}
    </div>
  );
}
