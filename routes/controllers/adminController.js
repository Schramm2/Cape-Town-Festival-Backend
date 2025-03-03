import { db } from "../../firebaseConfig.js";



// ✅ Fetch Admin Dashboard Statistics (Overall Event Statistics)
export const getAdminStats = async (req, res) => {
  try {
    console.log("Fetching admin dashboard statistics...");

    // ✅ Get Total Attendees (Count Users in Firestore)
    const usersSnapshot = await db.collection("users").get();
    const totalAttendees = usersSnapshot.size; // ✅ Count of registered users

    // ✅ Get Active Events (Count Events in Firestore)
    const eventsSnapshot = await db.collection("events").get();
    const activeEvents = eventsSnapshot.size; // ✅ Count of events

    // ✅ Calculate Average Rating from All Events
    let totalRatings = 0;
    let ratingsCount = 0;

    eventsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.Ratings && Array.isArray(data.Ratings)) {
        totalRatings += data.Ratings.reduce((sum, rating) => sum + rating, 0);
        ratingsCount += data.Ratings.length;
      }
    });

    const averageRating = ratingsCount > 0 ? (totalRatings / ratingsCount).toFixed(1) : "No Ratings Yet";

    // ✅ Return JSON Response
    res.status(200).json({
      totalAttendees,
      activeEvents,
      averageRating,
    });
  } catch (error) {
    console.error("Error fetching admin dashboard data:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
};

// Specific Event stats
export const getEventStats = async (req, res) => {
  try {
    const { eventId } = req.params;

    // ✅ Fetch Event Data
    const eventRef = db.collection("events").doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({ error: "Event not found" });
    }

    const eventData = eventDoc.data();
    const totalAttendees = eventData.RSVPs ? eventData.RSVPs.length : 0;
    const ratings = eventData.Ratings || [];
    const averageRating = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1) : "No Ratings Yet";

    res.status(200).json({ eventId, totalAttendees, averageRating });
  } catch (error) {
    console.error("Error fetching event statistics:", error);
    res.status(500).json({ error: "Failed to fetch event statistics" });
  }
};

export const getEventIDChartsData = async (req, res) => {
  try {
    const { eventId } = req.params;

    // ✅ Fetch Event Data
    const eventRef = db.collection("events").doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({ error: "Event not found" });
    }

    const eventData = eventDoc.data();
    const attendees = eventData.RSVPs || [];

    let ageDistribution = { "18-24": 0, "25-34": 0, "35-44": 0, "45-54": 0, "55+": 0 };
    let genderDistribution = { Male: 0, Female: 0, Other: 0 };

    for (let attendee of attendees) {
      const userRef = db.collection("users").doc(attendee);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const user = userDoc.data();

        // ✅ Count Age Groups
        if (user.age) {
          const age = parseInt(user.age);
          if (age >= 18 && age <= 24) ageDistribution["18-24"]++;
          else if (age >= 25 && age <= 34) ageDistribution["25-34"]++;
          else if (age >= 35 && age <= 44) ageDistribution["35-44"]++;
          else if (age >= 45 && age <= 54) ageDistribution["45-54"]++;
          else ageDistribution["55+"]++;
        }

        // ✅ Count Gender Distribution
        if (user.gender) {
          if (user.gender.toLowerCase() === "male") genderDistribution.Male++;
          else if (user.gender.toLowerCase() === "female") genderDistribution.Female++;
          else genderDistribution.Other++;
        }
      }
    }

    res.status(200).json({ eventId, ageDistribution, genderDistribution });
  } catch (error) {
    console.error("Error fetching event charts data:", error);
    res.status(500).json({ error: "Failed to fetch event charts" });
  }
};




// ✅ Fetch Overall Event Statistics for Charts
export const getEventChartsData = async (req, res) => {
  try {
    console.log("Fetching event statistics for charts...");

    const usersSnapshot = await db.collection("users").get();
    const eventsSnapshot = await db.collection("events").get();

    let ageDistribution = {
      "18-24": 0,
      "25-34": 0,
      "35-44": 0,
      "45-54": 0,
      "55+": 0,
    };

    let attendanceBySession = {};
    let genderDistribution = { Male: 0, Female: 0, Other: 0 };

    // ✅ Process Users for Age & Gender Distribution
    usersSnapshot.forEach((doc) => {
      const user = doc.data();

      // ✅ Count Age Groups
      if (user.age) {
        const age = parseInt(user.age);
        if (age >= 18 && age <= 24) ageDistribution["18-24"]++;
        else if (age >= 25 && age <= 34) ageDistribution["25-34"]++;
        else if (age >= 35 && age <= 44) ageDistribution["35-44"]++;
        else if (age >= 45 && age <= 54) ageDistribution["45-54"]++;
        else ageDistribution["55+"]++;
      }

      // ✅ Count Gender Distribution
      if (user.gender) {
        if (user.gender.toLowerCase() === "male") genderDistribution.Male++;
        else if (user.gender.toLowerCase() === "female") genderDistribution.Female++;
        else genderDistribution.Other++;
      }
    });

    // ✅ Process Events for Attendance Data
    eventsSnapshot.forEach((doc) => {
      const event = doc.data();
      attendanceBySession[event.title] = event.RSVPs ? event.RSVPs.length : 0;
    });

    res.status(200).json({ ageDistribution, attendanceBySession, genderDistribution });
  } catch (error) {
    console.error("Error fetching chart data:", error);
    res.status(500).json({ error: "Failed to fetch chart data" });
  }
};
