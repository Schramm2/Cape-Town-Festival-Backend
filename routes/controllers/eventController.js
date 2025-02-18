import { db } from "../../firebaseConfig.js";
import { Timestamp } from "firebase-admin/firestore"; // ✅ Import Firestore Timestamp


const formatTimestamp = (timestamp) => {
  if (!timestamp) return "No Date Provided"; // ✅ Ensure timestamp exists
  if (timestamp.toDate) {
    return timestamp.toDate().toLocaleString();
  }
  return timestamp; // ✅ If stored as a string, return it directly
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
    const rsvpRef = db.collection("rsvps").doc(); // Create new RSVP document

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

    // ✅ Prevent RSVP if the event has already occurred
    const eventDate = new Date(eventData.startTime);
    const now = new Date();
    if (now > eventDate) {
      return res.status(400).json({ error: "Event has already occurred. RSVP not allowed." });
    }

    // ✅ Ensure user's `rsvpEvents` array is updated (store event title)
    const updatedRSVPs = userData.rsvpEvents ? userData.rsvpEvents : [];

    // ✅ Prevent duplicate RSVP based on event title
    if (updatedRSVPs.includes(eventData.title)) {
      return res.status(400).json({ error: "You have already RSVP'd for this event!" });
    }
    const updatedRSVPCount = (eventData.attending) + 1;
    await eventRef.update({ attending: updatedRSVPCount });

    updatedRSVPs.push(eventData.title);
    await userRef.update({ rsvpEvents: updatedRSVPs });

    // ✅ Ensure `RSVPs` array exists in Firestore and add user's document ID
    const eventRSVPs = Array.isArray(eventData.RSVPs) ? [...eventData.RSVPs] : [];

    // ✅ Prevent duplicate user ID in `RSVPs` array
    if (!eventRSVPs.includes(userId)) {
      eventRSVPs.push(userId); // ✅ Add user's Firestore document ID to RSVPs
      await eventRef.update({ RSVPs: eventRSVPs });
    }

    // ✅ Create a new RSVP document in `rsvps` collection
    await rsvpRef.set({
      rsvpId: rsvpRef.id,
      userId,
      eventId,
      eventName: eventData.title,
      timestamp: new Date().toISOString(),
    });

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

    if (!eventDoc.exists) {
      return res.status(404).json({ error: "Event not found" });
    }
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const eventData = eventDoc.data();
    const userData = userDoc.data();

    // ✅ Prevent RSVP cancellation if the event has already started
    const eventDate = new Date(eventData.startTime);
    const now = new Date();
    if (now > eventDate) {
      return res.status(400).json({ error: "Event has already started. Cancellation not allowed." });
    }

    // ✅ Remove event title from user's rsvpEvents array
    const updatedRSVPs = userData.rsvpEvents.filter(title => title !== eventData.title);
    await userRef.update({ rsvpEvents: updatedRSVPs });

    // ✅ Decrease the RSVP count in the event
    const updatedRSVPCount = Math.max((eventData.attending || 0) - 1, 0);
    await eventRef.update({ attending: updatedRSVPCount });

    res.status(200).json({ message: "RSVP cancelled successfully", eventId });
  } catch (error) {
    console.error("Error cancelling RSVP:", error);
    res.status(500).json({ error: "Failed to cancel RSVP" });
  }
};
