import express, { json } from "express";
import { config } from "dotenv";
import cors from "cors";
import connect from "./config/db.js";
import authRoutes from "./routes/authRoute.js";
import userRoutes from "./routes/userRoute.js";
import taskRoutes from "./routes/taskRoute.js";
import reportRoutes from "./routes/reportRoute.js";
import path from "path";
import { fileURLToPath } from "url";
const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(json());

config();

// connect db
connect();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/reports", reportRoutes);

// expose static resources
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// render client
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`App is running on port: ${PORT}`);
});
