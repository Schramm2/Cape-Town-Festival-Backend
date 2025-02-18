import express from "express";
import { sendContactEmail,sendRSVPConfirmationEmail, sendRSVPCancellationEmail } from "./controllers/contactController.js";

const router = express.Router();

router.post("/send-email", sendContactEmail);
router.post("/send-rsvp-email", sendRSVPConfirmationEmail);
router.post("/send-rsvp-cancel-email", sendRSVPCancellationEmail); // ✅ Add Cancel RSVP email route



export default router;
