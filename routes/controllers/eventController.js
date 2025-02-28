import { db } from "../firebaseConfig.js"; // ✅ Import Firestore from updated config
import { Timestamp } from "firebase-admin/firestore"; // ✅ Import Firestore Timestamp
import nodemailer from "nodemailer";

// ✅ Use environment variables for email configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // ✅ Gmail email from .env
    pass: process.env.EMAIL_PASS, // ✅ Gmail app password from .env
  },
});

// ✅ Send RSVP confirmation/cancellation emails
const sendRSVPEmail = async (userEmail, userName, eventData, type) => {
  const subject = type === "confirm" ? `RSVP Confirmation: ${eventData.title}` : `RSVP Cancellation: ${eventData.title}`;
  const message = type === "confirm"
    ? `Hello ${userName},\n\nYou have successfully RSVP'd for the event "${eventData.title}".\n\n📅 Date: ${eventData.startTime.toDate().toLocaleString()}\n📍 Location: ${eventData.Location}\n\nWe look forward to seeing you there!\n\nBest Regards,\nCape Town Festival Team`
    : `Hello ${userName},\n\nYou have successfully CANCELLED your RSVP for the event "${eventData.title}".\n\nIf this was a mistake, you can RSVP again on the event page.\n\nBest Regards,\nCape Town Festival Team`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject,
    text: message,
  };

  await transporter.sendMail(mailOptions);
};

// ✅ Fetch all events from Firestore
export const getEvents = async (req, res) => {
  try {
    const snapshot = await db.collection("events").get();
    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startTime: doc.data().startTime?.toDate().toLocaleString() || "No Date Provided", // ✅ Convert Firestore timestamp
    }));

    res.status(200).json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

// ✅ Create a new event
export const createEvent = async (req, res) => {
  try {
    const { title, description, Category, date, time, Location, maxAttendees } = req.body;

    if (!title || !description || !Category || !date || !time || !Location || !maxAttendees) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // ✅ Convert date & time to Firestore Timestamp
    const eventDate = Timestamp.fromDate(new Date(`${date}T${time}`));

    // ✅ Add event to Firestore
    const newEventRef = db.collection("events").doc();
    await newEventRef.set({
      id: newEventRef.id,
      title,
      description,
      Category,
      startTime: eventDate,
      Location,
      maxAttendees: parseInt(maxAttendees),
      RSVPs: [],
      Comments: [],
      Ratings: [],
    });

    res.status(201).json({ message: "Event created successfully", eventId: newEventRef.id });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
};

// ✅ RSVP for an event
export const rsvpEvent = async (req, res) => {
  const { eventId, userId } = req.body;

  try {
    const eventRef = db.collection("events").doc(eventId);
    const userRef = db.collection("users").doc(userId);

    const eventDoc = await eventRef.get();
    const userDoc = await userRef.get();

    if (!eventDoc.exists) return res.status(404).json({ error: "Event not found" });
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });

    const eventData = eventDoc.data();
    const userData = userDoc.data();
    const userEmail = userData.email;

    if (new Date(eventData.startTime.toDate()) < new Date()) {
      return res.status(400).json({ error: "Event has already occurred. RSVP not allowed." });
    }

    if (userData.rsvpEvents?.includes(eventData.title)) {
      return res.status(400).json({ error: "You have already RSVP'd for this event!" });
    }

    await userRef.update({ rsvpEvents: [...(userData.rsvpEvents || []), eventData.title] });
    await eventRef.update({ RSVPs: [...(eventData.RSVPs || []), userId] });

    await sendRSVPEmail(userEmail, userData.fullname, eventData, "confirm");

    res.status(200).json({ message: "RSVP successful", eventId });
  } catch (error) {
    console.error("Error processing RSVP:", error);
    res.status(500).json({ error: "Failed to process RSVP" });
  }
};

// ✅ Fetch event by ID
export const getEventById = async (req, res) => {
  const { eventId } = req.params;

  try {
    const eventRef = db.collection("events").doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({ error: "Event not found" });
    }

    const data = eventDoc.data();

    res.status(200).json({
      id: eventDoc.id,
      ...data,
      startTime: data.startTime?.toDate().toLocaleString() || "No Date Provided",
    });
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ error: "Failed to fetch event" });
  }
};

// ✅ Cancel RSVP
export const cancelRSVP = async (req, res) => {
  const { eventId, userId } = req.body;

  try {
    const eventRef = db.collection("events").doc(eventId);
    const userRef = db.collection("users").doc(userId);

    const eventDoc = await eventRef.get();
    const userDoc = await userRef.get();

    if (!eventDoc.exists) return res.status(404).json({ error: "Event not found" });
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });

    const eventData = eventDoc.data();
    const userData = userDoc.data();
    const userEmail = userData.email;

    if (new Date(eventData.startTime.toDate()) < new Date()) {
      return res.status(400).json({ error: "Event has already started. Cancellation not allowed." });
    }

    await userRef.update({ rsvpEvents: userData.rsvpEvents.filter((title) => title !== eventData.title) });
    await eventRef.update({ RSVPs: eventData.RSVPs.filter((id) => id !== userId) });

    await sendRSVPEmail(userEmail, userData.fullname, eventData, "cancel");

    res.status(200).json({ message: "RSVP cancelled successfully", eventId });
  } catch (error) {
    console.error("Error cancelling RSVP:", error);
    res.status(500).json({ error: "Failed to cancel RSVP" });
  }
};
