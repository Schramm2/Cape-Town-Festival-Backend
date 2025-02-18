import { db, admin } from "../../firebaseConfig.js";

export const getUserProfile = async (req, res) => {
  const { uid } = req.params;

  try {
    if (!uid) {
      return res.status(400).json({ error: "Missing user ID" });
    }

    // ✅ Fetch user details from Firestore
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found in Firestore" });
    }

    const userData = userDoc.data();

    // ✅ Ensure rsvpEvents is always an array
    const eventsRSVPed = userData.rsvpEvents ? userData.rsvpEvents : [];

    res.status(200).json({ ...userData, rsvpEvents: eventsRSVPed });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};



export const registerUser = async (req, res) => {
  const { fullname, email, password, age, role, gender } = req.body;

  try {
    console.log("Received Registration Data:", req.body); // ✅ Debugging Log

    // ✅ Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: fullname,
    });

    console.log("Created Firebase User:", userRecord); // ✅ Debugging Log

    // ✅ Use Firebase Auth UID as Firestore Document ID
    const uid = userRecord.uid;

    // ✅ Store additional user data in Firestore
    await db.collection("users").doc(uid).set({
      uid,
      fullname,
      email,
      age,
      gender,
      role,
      createdAt: new Date().toISOString(),
    });

    // ✅ Generate Firebase Authentication Token
    const token = await admin.auth().createCustomToken(uid);

    console.log("User registered successfully with UID:", uid);

    res.status(201).json({ message: "User registered successfully", uid, token });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Failed to register user", details: error.message });
  }
};


