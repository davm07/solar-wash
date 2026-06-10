import { useParams, useNavigate } from "react-router-dom";
import { useCycleSummary } from "../hooks/useCycleSummary";
import formatDuration from "../utils/formatDuration";

export default function CycleDetailPage() {
  const { cycleId } = useParams();
  const navigate = useNavigate();

  const id = cycleId as string;

  const { data, isLoading, isError } = useCycleSummary(id);

  if (isLoading) {
    return <p>Cargando el resumen del ciclo...</p>;
  }

  if (isError || !data) {
    return (
      <p className="text-red-500">Error al cargar el resumen del ciclo</p>
    );
  }

  const getCycleDate = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate);
    const startStr = `${start.getDate()}/${start.getMonth() + 1}/${start.getFullYear()}`;

    if (!endDate) return `${startStr} - En curso`;

    const end = new Date(endDate);
    const endStr = `${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
    return `${startStr} - ${endStr}`;
  };

  const getCycleDuration = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffInSeconds = Math.floor(
      (end.getTime() - start.getTime()) / 1000,
    );
    return formatDuration(diffInSeconds);
  };

  return (
    <div className="max-w-4xl mx-auto mb-3 w-full">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-sm bg-olive-800 p-3 rounded-2xl text-olive-50 hover:bg-olive-400 transition-all"
      >
        ← Back to Plants
      </button>

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Resumen del ciclo</h1>
        <p className="text-gray-500 mt-1">Ciclo #{data.cycle.id}</p>
        <p className="text-sm mt-1">
          {data.cycle.finishedAt ? (
            <span className="text-green-700">Finalizado</span>
          ) : (
            <span className="text-yellow-700">En progreso</span>
          )}
        </p>
      </div>

      {/* INFO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* DATES */}
        <div className="bg-olive-50 rounded-xl shadow-sm border p-4 border-olive-200">
          <h2 className="font-semibold mb-2">Período</h2>
          <p>{getCycleDate(data.cycle.startedAt, data.cycle.finishedAt)}</p>
          <p className="text-sm text-gray-500">
            Duración: {getCycleDuration(data.cycle.startedAt, data.cycle.finishedAt)}
          </p>
        </div>

        {/* STATS */}
        <div className="bg-olive-50 rounded-xl shadow-sm border p-4 border-olive-200">
          <h2 className="font-semibold mb-2">Estadísticas</h2>
          <p>Sesiones: {data.sessions.length}</p>
          <p>Técnicos: {data.technicians.length}</p>
        </div>
      </div>

      {/* CYCLE PROGRESS */}
      <div className="bg-olive-50 rounded-xl shadow-sm border p-6 mt-6 border-olive-200">
        <div className="flex justify-between mb-2">
          <h2 className="font-semibold">Progreso del ciclo</h2>
          <span className="font-bold">{data.percentage}%</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden border-olive-200">
          <div
            className="bg-green-500 h-full transition-all"
            style={{ width: `${data.percentage}%` }}
          />
        </div>

        <div className="flex justify-between mt-4 text-sm text-gray-600">
          <span>Mesas lavadas: {data.mesasDone}</span>
          <span>Mesas totales: {data.totalMesas}</span>
        </div>
      </div>

      {/* TECHNICIAN BREAKDOWN */}
      {data.technicians.length > 0 && (
        <div className="bg-olive-50 rounded-xl shadow-sm border p-6 mt-4 border-olive-200">
          <h2 className="font-semibold mb-4">Contribución por técnico</h2>
          <div className="space-y-3">
            {data.technicians.map((tech) => (
              <div key={tech.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{tech.name}</p>
                  <p className="text-xs text-gray-500">
                    {tech.sessionCount} sesiones
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-olive-700">
                    {tech.mesasWashed} mesas
                  </p>
                  <p className="text-xs text-gray-500">
                    {data.totalMesas > 0
                      ? Math.round((tech.mesasWashed / data.totalMesas) * 100)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SESSIONS LIST */}
      {data.sessions.length > 0 && (
        <div className="bg-olive-50 rounded-xl shadow-sm border p-6 mt-4 border-olive-200">
          <h2 className="font-semibold mb-4">Sesiones del ciclo</h2>
          <div className="space-y-2">
            {data.sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => navigate(`/sessions/${session.id}`)}
                className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer"
              >
                <div>
                  <p className="font-medium">{session.technicianName}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(session.startedAt).toLocaleDateString()}
                    {session.finishedAt &&
                      ` - ${new Date(session.finishedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-olive-700">
                    {session.mesasWashed} mesas
                  </p>
                  <p className="text-xs text-gray-500">
                    {session.finishedAt ? "Finalizada" : "En curso"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
