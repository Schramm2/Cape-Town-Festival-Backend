import express from "express";
import { getAdminStats, getEventChartsData } from "./controllers/adminController.js";

const router = express.Router();

router.get("/stats", getAdminStats); // ✅ Admin statistics route
router.get("/statistics", getAdminStats); // ✅ Ensure statistics route is present
router.get("/charts", getEventChartsData); // ✅ Add event statistics route


export default router;
