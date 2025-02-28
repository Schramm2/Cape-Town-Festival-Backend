import express from "express";
import { getAdminStats, getEventChartsData, getEventIDChartsData, getEventStats } from "./controllers/adminController.js";

const router = express.Router();

router.get("/stats", getAdminStats); // ✅ Admin statistics route
router.get("/statistics", getAdminStats); // ✅ Ensure statistics route is present
router.get("/charts", getEventChartsData); // ✅ Add event statistics route

router.get("/statistics/:eventId", getEventStats);
router.get("/charts/:eventId", getEventIDChartsData);



export default router;
