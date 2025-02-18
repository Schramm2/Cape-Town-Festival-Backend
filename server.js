import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import eventRoutes from "./routes/eventRoutes.js"; // Import event routes
import userRoutes from "./routes/userRoutes.js"; // Import user routes
import contactRoutes from "./routes/contactRoutes.js"; // Import user routes
import adminRoutes from "./routes/adminRoutes.js"; // ✅ Import admin routes



dotenv.config();
const app = express();

app.use(cors({
    origin: "http://localhost:3000", // Adjust to match frontend URL
    methods: "GET,POST,PUT,DELETE",
    credentials: true
  }));
app.use(express.json());

// Attach Routes
app.use("/events", eventRoutes);
app.use("/users", userRoutes);
app.use("/contact", contactRoutes);
app.use("/admin", adminRoutes); // ✅ Attach admin routes


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
