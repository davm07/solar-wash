import { useParams, useNavigate } from "react-router-dom";
import { useSessionSummary } from "../hooks/useSessionSummary";
import formatDuration from "../utils/formatDuration";
import PlantMapViewer from "../components/PlantMapViewer";
import { useMesaRealtime } from "../hooks/useMesaRealtime";

export default function SessionSummaryPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const id = sessionId as string;

  const { data, isLoading, isError } = useSessionSummary(id);

  useMesaRealtime(data?.session.plant.id ?? null, data?.session.id ?? null);

  if (isLoading) {
    return <p>Cargando el resumen de la sesión...</p>;
  }

  if (isError || !data) {
    return (
      <p className="text-red-500">Error al cargar el resumen de la sesión</p>
    );
  }

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

  const mesaStatuses = Object.fromEntries(
    data.mesasSession.map((m) => [m.code, m.status]),
  );

  return (
    <div className="flex flex-col lg:flex-row">
      <div className="max-w-4xl mx-auto mb-3 w-full">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 text-sm bg-olive-800 p-3 rounded-2xl text-olive-50 hover:bg-olive-400 transition-all"
        >
          ← Volver a la vista de ciclos
        </button>
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Resumen de la sesión</h1>

          <p className="text-gray-500 mt-1">Sesión #{data.session.id}</p>
          <p className="text-sm mt-1">
            {data.session.finishedAt ? (
              <span className="text-green-700">Finalizada</span>
            ) : (
              <span className="text-yellow-700">En progreso</span>
            )}
          </p>
        </div>

        {/* INFO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PLANT */}
          <div className="bg-olive-50 rounded-xl shadow-sm border p-4 border-olive-200">
            <h2 className="font-semibold mb-2">Planta</h2>

            <p>{data.session.plant.name}</p>

            <p className="text-sm text-gray-500">
              {data.session.plant.location}
            </p>
          </div>

          {/* TECHNICIAN */}
          <div className="bg-olive-50 rounded-xl shadow-sm border p-4 border-olive-200">
            <h2 className="font-semibold mb-2">Técnico</h2>

            <p>{data.session.technician.name}</p>
          </div>

          {/* DATE */}
          <div className="bg-olive-50 rounded-xl shadow-sm border p-4 border-olive-200">
            <h2 className="font-semibold mb-2">Date</h2>

            <p>
              {data.session.finishedAt
                ? getSessionDate(
                    data.session.startedAt,
                    data.session.finishedAt,
                  )
                : `${new Date(data.session.startedAt).toLocaleDateString()} - En progreso`}
            </p>
          </div>

          {/* DURATION */}
          <div className="bg-olive-50 rounded-xl shadow-sm border p-4 border-olive-200">
            <h2 className="font-semibold mb-2">Duración</h2>
            <p>
              {formatDuration(Number(data.duracionTotal))}
              {!data.session.finishedAt && " (en curso)"}
            </p>
          </div>

          {/* WATER CONSUMPTION */}
          {data.session.waterConsumption != null && (
            <div className="bg-olive-50 rounded-xl shadow-sm border p-4 border-olive-200">
              <h2 className="font-semibold mb-2">Consumo de agua</h2>
              <p>{data.session.waterConsumption} m³</p>
            </div>
          )}
        </div>

        {/* WASHING PROGRESS - SESSION */}
        <div className="bg-olive-50 rounded-xl shadow-sm border p-6 mt-6 border-olive-200">
          <div className="flex justify-between mb-2">
            <h2 className="font-semibold">Progreso de lavado (esta sesión)</h2>

            <span className="font-bold">{data.porcentaje}%</span>
          </div>

          {/* PROGRESS BAR */}
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden border-olive-200">
            <div
              className="bg-green-500 h-full transition-all"
              style={{
                width: `${data.porcentaje}%`,
              }}
            />
          </div>

          {/* STATS */}
          <div className="flex justify-between mt-4 text-sm text-gray-600">
            <span>Mesas lavadas: {data.mesasLavadas}</span>

            <span>Mesas totales: {data.totalMesas}</span>
          </div>
        </div>

        {/* CYCLE PROGRESS (if available) */}
        {data.cycleProgress && (
          <div className="bg-blue-50 rounded-xl shadow-sm border p-6 mt-4 border-blue-200">
            <div className="flex justify-between mb-2">
              <h2 className="font-semibold text-blue-800">
                Progreso del ciclo completo
              </h2>
              <span className="font-bold text-blue-700">
                {data.cycleProgress.percentage}%
              </span>
            </div>

            <div className="w-full bg-blue-100 rounded-full h-4 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all"
                style={{
                  width: `${data.cycleProgress.percentage}%`,
                }}
              />
            </div>

            <div className="flex justify-between mt-4 text-sm text-blue-600">
              <span>
                Mesas lavadas en el ciclo: {data.cycleProgress.mesasDone}
              </span>
              <span>Total: {data.cycleProgress.totalMesas}</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 px-12 flex flex-col items-center justify-center lg:max-h-[80vh] mb-3 lg:mb-0">
        <PlantMapViewer
          mesaStatuses={mesaStatuses}
          svg={data.session.plant.svgContent}
        />
        <p className="text-xs text-gray-500 mt-2 text-center">
          Solo las mesas terminadas o en progreso son mostradas en esta sección.{" "}
          {data.cycleProgress && (
            <span
              className="underline cursor-pointer hover:text-gray-600"
              onClick={() => navigate(`/cycles/${data.cycleProgress!.cycleId}`)}
            >
              Para observar un resumen total regresa a la página de resumen de
              ciclos.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
