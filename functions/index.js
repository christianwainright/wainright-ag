const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");

admin.initializeApp();

// Configure the Nodemailer Gmail OAuth2 Transporter
const getTransporter = () => {
  const user = process.env.SMTP_USER; // e.g., christianwainright@gmail.com
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.OAUTH_REFRESH_TOKEN;
  
  if (!user || !clientId || !clientSecret || !refreshToken) {
    console.warn("Gmail OAuth2 credentials are not fully configured. Emails will not be sent.");
    return null;
  }
  
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: user,
      clientId: clientId,
      clientSecret: clientSecret,
      refreshToken: refreshToken
    }
  });
};

/**
 * Helper to ensure "Website RSVPs" and "Manual RSVPs" sheets exist in the spreadsheet.
 */
async function ensureWorksheets(sheets, spreadsheetId) {
  const response = await sheets.spreadsheets.get({
    spreadsheetId
  });
  
  const existingSheets = (response.data.sheets || []).map(s => s.properties.title);
  const requiredSheets = ["Website RSVPs", "Manual RSVPs"];
  const requests = [];
  
  for (const sheetName of requiredSheets) {
    if (!existingSheets.includes(sheetName)) {
      requests.push({
        addSheet: {
          properties: {
            title: sheetName
          }
        }
      });
    }
  }
  
  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests }
    });
    console.log(`Created worksheets: ${requests.map(r => r.addSheet.properties.title).join(", ")}`);
  }

  // Add headers if sheets were newly created
  for (const sheetName of requiredSheets) {
    if (!existingSheets.includes(sheetName)) {
      const headers = sheetName === "Website RSVPs" 
        ? [["Timestamp", "Name", "Email", "Attending", "Guests", "Advice/Message"]]
        : [["Date Added", "Name", "Email", "Attending", "Guests", "Notes"]];
      
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: "RAW",
        resource: { values: headers }
      });
    }
  }
}

/**
 * Trigger: On new RSVP document created
 */
exports.onRsvpCreatedHandler = async (event) => {
  const snap = event.data;
  if (!snap) return null;
  
  const data = snap.data();
  const name = data.name || "Anonymous";
  const email = data.email || "Not provided";
  const attending = data.attending || "no";
  const attendingLabel = attending === "yes" ? "Attending" : "Not Attending";
  const guests = data.guests || 0;
  const advice = data.advice || "None";
  
  // 1. Sync to Google Sheets if spreadsheet ID is configured in Firestore
  try {
    const configSnap = await admin.firestore().doc("config/google").get();
    const spreadsheetId = configSnap.exists ? configSnap.data().rsvpSpreadsheetId : null;
    
    if (spreadsheetId) {
      const auth = new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/spreadsheets"]
      });
      const authClient = await auth.getClient();
      console.log("Service Account Client Email:", authClient.email || "Default ADC");
      
      const sheets = google.sheets({ version: "v4", auth: authClient });
      
      // Ensure worksheets exist
      await ensureWorksheets(sheets, spreadsheetId);
      
      // Format timestamp in EST/EDT
      const timestampStr = data.timestamp 
        ? new Date(data.timestamp.toDate()).toLocaleString("en-US", { timeZone: "America/New_York" }) 
        : new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
        
      const rowValues = [
        timestampStr,
        name,
        email,
        attending === "yes" ? "Yes" : "No",
        guests,
        advice
      ];
      
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'Website RSVPs'!A:F",
        valueInputOption: "USER_ENTERED",
        resource: {
          values: [rowValues]
        }
      });
      console.log(`Successfully synced RSVP for ${name} to Google Sheets.`);
    } else {
      console.warn("Google Sheet ID is not configured in Firestore config/google. Skipping Sheets sync.");
    }
  } catch (sheetError) {
    console.error("Failed to sync RSVP to Google Sheets:", sheetError);
  }

  // 2. Send email notification
  const transporter = getTransporter();
  if (!transporter) return null;
  
  const subject = `Baby Shower RSVP: ${name} is ${attendingLabel}!`;
  const body = `You have received a new RSVP for A Tiny Human Gathering!\n\n` +
               `Name: ${name}\n` +
               `Email: ${email}\n` +
               `Status: ${attendingLabel}\n` +
               `Number of Guests: ${guests}\n` +
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
};

exports.onRsvpCreated = onDocumentCreated({
  document: "rsvps/{rsvpId}",
  secrets: ["SMTP_USER", "OAUTH_CLIENT_ID", "OAUTH_CLIENT_SECRET", "OAUTH_REFRESH_TOKEN"]
}, exports.onRsvpCreatedHandler);


/**
 * Trigger: On new Guess document created
 */
exports.onGuessCreated = onDocumentCreated({
  document: "guesses/{guessId}",
  secrets: ["SMTP_USER", "OAUTH_CLIENT_ID", "OAUTH_CLIENT_SECRET", "OAUTH_REFRESH_TOKEN"]
}, async (event) => {
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

/**
 * Trigger: On new Contact document created
 */
exports.onContactCreated = onDocumentCreated({
  document: "contacts/{contactId}",
  secrets: ["SMTP_USER", "OAUTH_CLIENT_ID", "OAUTH_CLIENT_SECRET", "OAUTH_REFRESH_TOKEN"]
}, async (event) => {
  const snap = event.data;
  if (!snap) return null;
  
  const data = snap.data();
  const name = data.name || "Anonymous";
  const email = data.email || "Not provided";
  const subject = data.subject || "No Subject";
  const message = data.message || "No Message";
  
  const transporter = getTransporter();
  if (!transporter) return null;
  
  const emailSubject = `Contact Form Submission: ${subject}`;
  const body = `You have received a new contact form submission on wainright.net!\n\n` +
               `Name: ${name}\n` +
               `Email: ${email}\n` +
               `Subject: ${subject}\n\n` +
               `Message:\n${message}\n\n` +
               `This is an automated notification from wainright.net.`;
               
  try {
    await transporter.sendMail({
      from: `"Wainright Net" <${process.env.SMTP_USER}>`,
      to: "christianwainright@gmail.com",
      subject: emailSubject,
      text: body
    });
    console.log(`Contact email sent successfully for ${name}`);
  } catch (error) {
    console.error("Failed to send contact email:", error);
  }
});
