import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./index";
import { users, plants, mesas } from "../db/schema";
import { eq } from "drizzle-orm";

async function seed() {
  const passwordHash = await bcrypt.hash("123456", 10);

  // Usuarios
  const [tecnico, cliente] = await db
    .insert(users)
    .values([
      {
        email: "tecnico@solar.com",
        passwordHash,
        name: "Técnico Demo",
        role: "technician",
      },
      {
        email: "cliente@solar.com",
        passwordHash,
        name: "Cliente Demo",
        role: "client",
      },
    ])
    .returning();

  // Planta
  const [planta] = await db
    .insert(plants)
    .values({
      name: "Planta Norte Demo",
      location: "Almería, España",
      clientId: cliente.id,
      totalMesas: 6,
    })
    .returning();

  // Mesas
  await db.insert(mesas).values([
    {
      plantId: planta.id,
      code: "MESA-001",
      label: "Mesa A-01",
      row: 0,
      col: 0,
    },
    {
      plantId: planta.id,
      code: "MESA-002",
      label: "Mesa A-02",
      row: 0,
      col: 1,
    },
    {
      plantId: planta.id,
      code: "MESA-003",
      label: "Mesa A-03",
      row: 0,
      col: 2,
    },
    {
      plantId: planta.id,
      code: "MESA-004",
      label: "Mesa B-01",
      row: 1,
      col: 0,
    },
    {
      plantId: planta.id,
      code: "MESA-005",
      label: "Mesa B-02",
      row: 1,
      col: 1,
    },
    {
      plantId: planta.id,
      code: "MESA-006",
      label: "Mesa B-03",
      row: 1,
      col: 2,
    },
  ]);

  console.log("✅ Seed completo");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
