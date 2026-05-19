import "dotenv/config";
import { db } from "./index";
import { mesas, plants } from "./schema";
import { eq } from "drizzle-orm";

async function seedMesas() {
  // Obtén el id de la planta demo
  const [plant] = await db.select().from(plants);

  if (!plant) {
    console.error("No hay plantas en la base de datos");
    process.exit(1);
  }

  // Primero borra las mesas existentes de esa planta
  await db.delete(mesas).where(eq(mesas.plantId, plant.id));

  // Genera las 36 mesas
  const mesasData = Array.from({ length: 36 }, (_, i) => {
    const num = String(i + 1).padStart(2, "0");
    return {
      plantId: plant.id,
      code: `mesa_${num}`,
      label: `Mesa ${num}`,
      row: Math.floor(i / 6),
      col: i % 6,
    };
  });

  await db.insert(mesas).values(mesasData);
  console.log(
    `✅ ${mesasData.length} mesas creadas para la planta "${plant.name}"`,
  );
  process.exit(0);
}

seedMesas().catch((err) => {
  console.error(err);
  process.exit(1);
});
