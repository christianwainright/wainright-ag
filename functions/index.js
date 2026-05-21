const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configure the Nodemailer SMTP Transporter
const getTransporter = () => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  
  if (!user || !pass) {
    console.warn("SMTP_USER and SMTP_PASS environment variables are not set. Emails will not be sent.");
    return null;
  }
  
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass }
  });
};

/**
 * Trigger: On new RSVP document created
 */
exports.onRsvpCreated = onDocumentCreated("rsvps/{rsvpId}", async (event) => {
  const snap = event.data;
  if (!snap) return null;
  
  const data = snap.data();
  const name = data.name || "Anonymous";
  const attending = data.attending || "no";
  const attendingLabel = attending === "yes" ? "Attending" : "Not Attending";
  const guests = data.guests || 0;
  const diet = data.diet || "None";
  const song = data.song || "None";
  const advice = data.advice || "None";
  
  const transporter = getTransporter();
  if (!transporter) return null;
  
  const subject = `Baby Shower RSVP: ${name} is ${attendingLabel}!`;
  const body = `You have received a new RSVP for A Tiny Human Gathering!\n\n` +
               `Name: ${name}\n` +
               `Status: ${attendingLabel}\n` +
               `Number of Guests: ${guests}\n` +
               `Dietary Restrictions: ${diet}\n` +
               `Song Suggestion: ${song}\n` +
               `Message/Advice:\n${advice}\n\n` +
               `This is an automated notification from wainright.net.`;
               
  try {
    await transporter.sendMail({
      from: `"Wainright Net" <${process.env.SMTP_USER}>`,
      to: "ageliki@wainright.net",
      cc: "christianwainright@gmail.com",
      subject: subject,
      text: body
    });
    console.log(`RSVP email sent successfully for ${name}`);
  } catch (error) {
    console.error("Failed to send RSVP email:", error);
  }
});

/**
 * Trigger: On new Guess document created
 */
exports.onGuessCreated = onDocumentCreated("guesses/{guessId}", async (event) => {
  const snap = event.data;
  if (!snap) return null;
  
  const data = snap.data();
  const name = data.name || "Anonymous";
  const date = data.date || "No date";
  const weightLbs = data.weightLbs || 0;
  const weightOz = data.weightOz || 0;
  const hair = data.hair || "No guess";
  const eyes = data.eyes || "No guess";
  
  const transporter = getTransporter();
  if (!transporter) return null;
  
  const subject = `Baby Stats Guess: New submission from ${name}!`;
  const body = `You have received a new guess for the Baby Stats Game!\n\n` +
               `Guest Name: ${name}\n` +
               `Predicted Date: ${date}\n` +
               `Predicted Weight: ${weightLbs} lbs ${weightOz} oz\n` +
               `Predicted Hair: ${hair}\n` +
               `Predicted Eyes: ${eyes}\n\n` +
               `This is an automated notification from wainright.net.`;
               
  try {
    await transporter.sendMail({
      from: `"Wainright Net" <${process.env.SMTP_USER}>`,
      to: "christianwainright@gmail.com",
      subject: subject,
      text: body
    });
    console.log(`Guess email sent successfully for ${name}`);
  } catch (error) {
    console.error("Failed to send Guess email:", error);
  }
});
