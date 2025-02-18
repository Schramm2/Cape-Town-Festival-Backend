import express from "express";
import { registerUser } from "./controllers/userController.js";
import { getUserProfile } from "./controllers/userController.js";

const router = express.Router();

router.post("/register", registerUser); // ✅ POST /users/register
router.get("/profile/:uid", getUserProfile);

export default router;
