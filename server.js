import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/database.js";
import userRoutes from "./routes/user.js";
import authRoutes from "./routes/auth.js";
import menuRoutes from "./routes/menu.js";
import orderRoutes from "./routes/order.js";
import tableRoutes from "./routes/table.js";
import categoryRoutes from "./routes/category.js";
import { auth } from "./middleware/authMiddleware.js";
import path from "path";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).send("OK");
});

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/menus", auth, menuRoutes);
app.use("/api/orders", auth, orderRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
global.io = io; // simple access in routes

io.on("connection", (socket) => {
  console.log("Socket connected", socket.id);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("Server running on", PORT));
