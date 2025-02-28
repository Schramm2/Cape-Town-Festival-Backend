import { db } from "../../firebaseConfig.js";
import { Timestamp } from "firebase-admin/firestore"; // ✅ Import Firestore Timestamp
import nodemailer from "nodemailer";


const formatTimestamp = (timestamp) => {
  if (!timestamp) return "No Date Provided"; // ✅ Ensure timestamp exists
  if (timestamp.toDate) {
    return timestamp.toDate().toLocaleString();
  }
  return timestamp; // ✅ If stored as a string, return it directly
};
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS, // App password or SMTP password
  },
});
const sendRSVPEmail = async (userEmail, userName, eventData, type) => {
  const subject = type === "confirm" ? `RSVP Confirmation: ${eventData.title}` : `RSVP Cancellation: ${eventData.title}`;
  const message =
    type === "confirm"
      ? `Hello ${userName},\n\nYou have successfully RSVP'd for the event "${eventData.title}".\n\n📅 Date: ${eventData.startTime.toDate().toLocaleString()}\n📍 Location: ${eventData.Location}\n\nWe look forward to seeing you there!\n\nBest Regards,\nCape Town Festival Team`
      : `Hello ${userName},\n\nYou have successfully **CANCELLED** your RSVP for the event "${eventData.title}".\n\nIf this was a mistake, you can RSVP again on the event page.\n\nBest Regards,\nCape Town Festival Team`;

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
    const events = snapshot.docs.map(doc => {
      const data = doc.data();

      return {
        id: doc.id, // ✅ Include Firestore document ID
        title: data.title || "Untitled Event",
        description: data.description || "No description available",
        category: data.Category || "Uncategorized",
        location: data.Location || "Unknown",
        startTime: formatTimestamp(data.startTime), // ✅ Convert Firestore timestamp
        RSVPs: data.RSVPs || 0,
        attending: data.attending,
        maxAttendees: data.maxAttendees || "Unknown",
        Comments: data.Comments ? data.Comments : [],
        Ratings: data.Ratings ? data.Ratings : [],
      };
    });

    res.status(200).json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

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
      startTime: eventDate, // ✅ Store as Firestore Timestamp
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

export const rsvpEvent = async (req, res) => {
  const { eventId, userId } = req.body;

  try {
    console.log(`Processing RSVP for event: ${eventId} by user: ${userId}`);

    const eventRef = db.collection("events").doc(eventId);
    const userRef = db.collection("users").doc(userId);

    const eventDoc = await eventRef.get();
    const userDoc = await userRef.get();

    if (!eventDoc.exists) return res.status(404).json({ error: "Event not found" });
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });

    const eventData = eventDoc.data();
    const userData = userDoc.data();
    const userEmail = userData.email;

    // ✅ Prevent RSVP if the event has already occurred
    if (new Date(eventData.startTime.toDate()) < new Date()) {
      return res.status(400).json({ error: "Event has already occurred. RSVP not allowed." });
    }

    // ✅ Prevent duplicate RSVP
    if (userData.rsvpEvents && userData.rsvpEvents.includes(eventData.title)) {
      return res.status(400).json({ error: "You have already RSVP'd for this event!" });
    }

    // ✅ Update RSVP count and user data
    await userRef.update({ rsvpEvents: [...(userData.rsvpEvents || []), eventData.title] });
    await eventRef.update({ RSVPs: [...(eventData.RSVPs || []), userId] });

    // ✅ Send RSVP confirmation email
    await sendRSVPEmail(userEmail, userData.fullname, eventData, "confirm");

    res.status(200).json({ message: "RSVP successful", eventId });
  } catch (error) {
    console.error("Error processing RSVP:", error);
    res.status(500).json({ error: "Failed to process RSVP" });
  }
};


export const getEventById = async (req, res) => {
  const { eventId } = req.params;
  const { userId } = req.query; // ✅ Get userId from query parameters

  try {
    const eventRef = db.collection("events").doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({ error: "Event not found" });
    }

    const data = eventDoc.data();

    let userHasRSVPed = false;

    // ✅ Check if user has RSVP'd
    if (userId) {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData.rsvpEvents && userData.rsvpEvents.includes(data.title)) {
          userHasRSVPed = true;
        }
      }
    }

    res.status(200).json({
      id: eventDoc.id,
      title: data.title,
      description: data.description,
      category: data.Category,
      location: data.Location,
      startTime: formatTimestamp(data.startTime),
      RSVPs: data.RSVPs || 0,
      attending: data.attending,
      maxAttendees: data.maxAttendees,
      Comments: data.Comments ? data.Comments : [],
      Ratings: data.Ratings ? data.Ratings : [],
      userHasRSVPed, // ✅ Send RSVP status
    });
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ error: "Failed to fetch event" });
  }
};

// ✅ Delete an event from Firestore
export const deleteEvent = async (req, res) => {
  const { eventId } = req.params;

  try {
    const eventRef = db.collection("events").doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({ error: "Event not found" });
    }

    await eventRef.delete(); // ✅ Remove the event from Firestore

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: "Failed to delete event" });
  }
};


export const rateEvent = async (req, res) => {
  const { eventId, userId, rating, comment } = req.body;

  try {
    console.log(`Processing rating & comment for event: ${eventId} by user: ${userId}`);

    const eventRef = db.collection("events").doc(eventId);
    const userRef = db.collection("users").doc(userId);

    const eventDoc = await eventRef.get();
    const userDoc = await userRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({ error: "Event not found" });
    }
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const eventData = eventDoc.data();
    const userData = userDoc.data();

    // ✅ Ensure user has RSVP'd before allowing rating and comment
    if (!userData.rsvpEvents || !userData.rsvpEvents.includes(eventData.title)) {
      return res.status(400).json({ error: "You must RSVP to rate and comment on this event." });
    }

    // ✅ Ensure Ratings is an array and add the new rating
    const updatedRatings = Array.isArray(eventData.Ratings) ? [...eventData.Ratings, rating] : [rating];

    // ✅ Ensure Comments is an array and add the new comment if provided
    const updatedComments = Array.isArray(eventData.Comments) ? [...eventData.Comments] : [];
    if (comment) {
      updatedComments.push(comment);
    }

    // ✅ Update Firestore
    await eventRef.update({ Ratings: updatedRatings, Comments: updatedComments });

    res.status(200).json({ message: "Rating and comment submitted successfully", updatedRatings, updatedComments });
  } catch (error) {
    console.error("Error submitting rating & comment:", error);
    res.status(500).json({ error: "Failed to submit rating and comment" });
  }
};
export const cancelRSVP = async (req, res) => {
  const { eventId, userId } = req.body;

  try {
    console.log(`Cancelling RSVP for event: ${eventId} by user: ${userId}`);

    const eventRef = db.collection("events").doc(eventId);
    const userRef = db.collection("users").doc(userId);

    const eventDoc = await eventRef.get();
    const userDoc = await userRef.get();

    if (!eventDoc.exists) return res.status(404).json({ error: "Event not found" });
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });

    const eventData = eventDoc.data();
    const userData = userDoc.data();
    const userEmail = userData.email;

    // ✅ Prevent RSVP cancellation if the event has already started
    if (new Date(eventData.startTime.toDate()) < new Date()) {
      return res.status(400).json({ error: "Event has already started. Cancellation not allowed." });
    }

    // ✅ Remove RSVP from user and event data
    await userRef.update({ rsvpEvents: userData.rsvpEvents.filter((title) => title !== eventData.title) });
    await eventRef.update({ RSVPs: eventData.RSVPs.filter((id) => id !== userId) });

    // ✅ Send RSVP cancellation email
    await sendRSVPEmail(userEmail, userData.fullname, eventData, "cancel");

    res.status(200).json({ message: "RSVP cancelled successfully", eventId });
  } catch (error) {
    console.error("Error cancelling RSVP:", error);
    res.status(500).json({ error: "Failed to cancel RSVP" });
  }
};