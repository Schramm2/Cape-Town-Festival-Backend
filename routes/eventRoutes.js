import express from "express";
import { getEvents, getEventById, rsvpEvent, cancelRSVP, rateEvent, createEvent, deleteEvent } from "./controllers/eventController.js";

const router = express.Router();

// ✅ Ensure the API endpoint matches the frontend request
router.get("/", getEvents);
router.get("/:eventId", getEventById); // ✅ Ensure route matches frontend
router.post("/rsvp", rsvpEvent);
router.post("/cancel-rsvp", cancelRSVP); // ✅ Add Cancel RSVP route
router.post("/rate", rateEvent); // ✅ Add rate event route
router.post("/create", createEvent); // ✅ Add route for event creation
router.delete("/:eventId", deleteEvent); // ✅ Add route to delete an event


export default router;
