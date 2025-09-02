import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import eventsRoutes from "./routes/eventsRoutes.js";
import ticketsRoutes from "./routes/ticketsRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import notificationsRoutes from "./routes/notificationsRoutes.js";
import attendeeRoutes from "./routes/attendeeRoutes.js";

dotenv.config();
await connectDB();

const app = express();
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/tickets", ticketsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/attendee", attendeeRoutes);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API on : http://localhost:${port}`));
