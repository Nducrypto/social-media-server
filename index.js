import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import postRoutes from "./routes/posts.js";
import userRoutes from "./routes/user.js";
// import migration from "./routes/migration.js";

const app = express();
dotenv.config();
const server = createServer(app);

app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));

app.use(cors());
// const io = new Server(server);
const io = new Server(server, {
  cors: {
    origin: process.env.SOCKET_ORIGIN_URL,
    methods: process.env.SOCKET_METHODS,
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
});

app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
// app.use("/migration", migration);

io.on("connection", (socket) => {
  socket.on("disconnect", () => {});
});

export { io };

app.use((err, req, res, next) => {
  const errorStatus = err.status || 500;
  const errorMessage = err.message || "something went wrong";
  return res.status(errorStatus).json({
    success: false,
    errorStatus: errorStatus,
    message: errorMessage,
    stack: err.stack,
    ndu: err.ndu,
  });
});

const PORT = process.env.PORT;

const connect = async () => {
  try {
    await mongoose.connect(process.env.CONNECTION_URL);
    console.log("connected to mongodb");
  } catch (error) {
    throw error;
  }
};

server.listen(PORT, () => {
  connect();
});
