import { usePlants } from "../hooks/usePlants";
import PlantCard from "../components/PlantCard";

export default function DashboardPage() {
  const { data: plants, isLoading } = usePlants();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Plantas de Paneles</h2>

      {isLoading && <p className="text-gray-500">Loading plants...</p>}

      {plants?.map((plant) => (
        <PlantCard key={plant.id} plant={plant} />
      ))}
    </div>
  );
}
