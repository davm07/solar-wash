import "dotenv/config";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import plantsRouter from "./routes/plants";
import mesasRouter from "./routes/mesas";
import sessionsRouter from "./routes/sessions";
import testRouter from "./routes/test";
import { startScheduler } from "./lib/scheduler";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/auth", authRouter);
app.use("/plants", plantsRouter);
app.use("/mesas", mesasRouter);
app.use("/sessions", sessionsRouter);
app.use("/test", testRouter);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  startScheduler();
});
