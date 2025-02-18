import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { db } from "../../firebaseConfig.js"; // ✅ Import Firestore

dotenv.config();




// ✅ Configure Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // Use Gmail or another email provider
  auth: {
    user: process.env.EMAIL_USER, // Your festival email
    pass: process.env.EMAIL_PASS, // App password or SMTP password
  },
});

export const sendRSVPConfirmationEmail = async (req, res) => {
  const { userId, eventId } = req.body;

  try {
    console.log(`Sending RSVP email for event: ${eventId} to user: ${userId}`);

    // ✅ Fetch user details from Firestore
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();
    const userEmail = userData.email;

    // ✅ Fetch event details from Firestore
    const eventRef = db.collection("events").doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({ error: "Event not found" });
    }

    const eventData = eventDoc.data();

    // ✅ Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: `RSVP Confirmation: ${eventData.title}`,
      text: `Hello ${userData.fullname},\n\nYou have successfully RSVP'd for the event "${eventData.title}".\n\nEvent Details:\n- Date: ${eventData.startTime.toDate().toLocaleString()}\n- Location: ${eventData.Location}\n\nWe look forward to seeing you there!\n\nBest Regards,\nCape Town Festival Team`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "RSVP confirmation email sent successfully!" });
  } catch (error) {
    console.error("Error sending RSVP email:", error);
    res.status(500).json({ error: "Failed to send RSVP confirmation email" });
  }
};

// ✅ Handle Contact Form Submission
export const sendContactEmail = async (req, res) => {
  const { name, email, subject, message } = req.body;

  try {
    const mailOptions = {
      from: email, // User's email
      to: process.env.EMAIL_USER, // Your festival email
      subject: `Contact Form Submission: ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
};

export const sendRSVPCancellationEmail = async (req, res) => {
  const { userId, eventId } = req.body;

  try {
    console.log(`Sending RSVP cancellation email for event: ${eventId} to user: ${userId}`);

    // ✅ Fetch user details from Firestore
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();
    const userEmail = userData.email;

    // ✅ Fetch event details from Firestore
    const eventRef = db.collection("events").doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({ error: "Event not found" });
    }

    const eventData = eventDoc.data();

    // ✅ Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: `RSVP Cancellation: ${eventData.title}`,
      text: `Hello ${userData.fullname},\n\nYou have successfully **CANCELLED** your RSVP for the event "${eventData.title}".\n\nIf this was a mistake, you can RSVP again through the event page.\n\nBest Regards,\nCape Town Festival Team`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "RSVP cancellation email sent successfully!" });
  } catch (error) {
    console.error("Error sending RSVP cancellation email:", error);
    res.status(500).json({ error: "Failed to send RSVP cancellation email" });
  }
};
