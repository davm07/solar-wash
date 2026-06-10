import "dotenv/config";
import { db } from "./index";
import { mesas, plants } from "./schema";
import { eq } from "drizzle-orm";
import { supabase } from "../lib/supabase";

async function seedMesas() {
  const [plant] = await db.select().from(plants);
  if (!plant) {
    console.error("No hay plantas en la base de datos");
    process.exit(1);
  }

  // 1. Delete existing mesas
  await db.delete(mesas).where(eq(mesas.plantId, plant.id));

  // 2. Download SVG from Supabase Storage
  const { data, error } = await supabase.storage
    .from("plantas")
    .download(plant.svgPath!);

  if (error || !data) {
    console.error("Error descargando SVG:", error);
    process.exit(1);
  }

  const svgText = await data.text();

  // 3. Extract all mesa IDs (simple regex, no full parse needed)
  const idRegex = /id="(mesa_\d+)"/g;
  const ids: string[] = [];
  let match;
  while ((match = idRegex.exec(svgText)) !== null) {
    ids.push(match[1]);
  }

  // 4. Insert in batches of 500
  const mesasData = ids.map((code) => ({
    plantId: plant.id,
    code,
    label: `Mesa ${code.replace("mesa_", "")}`,
  }));

  const BATCH = 500;
  for (let i = 0; i < mesasData.length; i += BATCH) {
    await db.insert(mesas).values(mesasData.slice(i, i + BATCH));
  }

  console.log(`✅ ${mesasData.length} mesas creadas para "${plant.name}"`);
  process.exit(0);
}

seedMesas().catch((err) => {
  console.error(err);
  process.exit(1);
});
