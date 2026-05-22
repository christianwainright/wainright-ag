const test = require("node:test");
const assert = require("node:assert");

// Set mock environment variables for Nodemailer transporter check
process.env.SMTP_USER = "test@gmail.com";
process.env.OAUTH_CLIENT_ID = "mock-client-id";
process.env.OAUTH_CLIENT_SECRET = "mock-client-secret";
process.env.OAUTH_REFRESH_TOKEN = "mock-refresh-token";

// 1. Mock firebase-admin
const mockFirestore = {
  doc: (path) => {
    if (path === "config/google") {
      return {
        get: () => Promise.resolve({
          exists: true,
          data: () => ({ rsvpSpreadsheetId: "mock-spreadsheet-id" })
        })
      };
    }
    throw new Error(`Unexpected doc path: ${path}`);
  }
};

const adminMock = {
  initializeApp: () => {},
  firestore: () => mockFirestore
};

require.cache[require.resolve("firebase-admin")] = {
  exports: adminMock
};

// 2. Mock nodemailer
const mockSendMail = (() => {
  let sentMail = [];
  return {
    sendMail: (options) => {
      sentMail.push(options);
      return Promise.resolve({ messageId: "mock-id" });
    },
    getSent: () => sentMail,
    clear: () => { sentMail = []; }
  };
})();

const nodemailerMock = {
  createTransport: () => mockSendMail
};

require.cache[require.resolve("nodemailer")] = {
  exports: nodemailerMock
};

// 3. Mock googleapis
let mockAppendCalls = [];
let mockUpdateCalls = [];
const mockSheets = {
  spreadsheets: {
    get: () => Promise.resolve({ data: { sheets: [{ properties: { title: "Website RSVPs" } }, { properties: { title: "Manual RSVPs" } }] } }),
    values: {
      append: (params) => {
        mockAppendCalls.push(params);
        return Promise.resolve();
      },
      update: (params) => {
        mockUpdateCalls.push(params);
        return Promise.resolve();
      }
    }
  }
};

const googleapisMock = {
  google: {
    sheets: () => mockSheets,
    auth: {
      GoogleAuth: class {
        getClient() {
          return Promise.resolve({ email: "mock@service.com" });
        }
      }
    }
  }
};

require.cache[require.resolve("googleapis")] = {
  exports: googleapisMock
};

// Import functions under test after mocks are in place
const { onRsvpCreatedHandler } = require("./index.js");

test("onRsvpCreated trigger for attending = yes", async (t) => {
  mockSendMail.clear();
  mockAppendCalls = [];
  mockUpdateCalls = [];

  const mockDate = new Date("2026-05-21T12:00:00Z");
  const mockEvent = {
    data: {
      data: () => ({
        name: "Alice Smith",
        email: "alice@example.com",
        attending: "yes",
        guests: 3,
        advice: "Can't wait to play some board games!",
        timestamp: {
          toDate: () => mockDate
        }
      })
    }
  };

  await onRsvpCreatedHandler(mockEvent);

  // Assert Sheets integration
  assert.strictEqual(mockAppendCalls.length, 1);
  const appendCall = mockAppendCalls[0];
  assert.strictEqual(appendCall.spreadsheetId, "mock-spreadsheet-id");
  assert.strictEqual(appendCall.range, "'Website RSVPs'!A:F");
  
  const values = appendCall.resource.values[0];
  assert.strictEqual(values[1], "Alice Smith");
  assert.strictEqual(values[2], "alice@example.com");
  assert.strictEqual(values[3], "Yes");
  assert.strictEqual(values[4], 3);
  assert.strictEqual(values[5], "Can't wait to play some board games!");
  // The row values array should have exactly 6 elements
  assert.strictEqual(values.length, 6);

  // Assert Email Integration
  const sent = mockSendMail.getSent();
  assert.strictEqual(sent.length, 1);
  const email = sent[0];
  assert.strictEqual(email.to, "ageliki@wainright.net");
  assert.strictEqual(email.cc, "christianwainright@gmail.com");
  assert.ok(email.subject.includes("Alice Smith is Attending"));
  
  // Verify it contains name and guests, but not Dietary Restrictions or Song Suggestion
  assert.ok(email.text.includes("Name: Alice Smith"));
  assert.ok(email.text.includes("Number of Guests: 3"));
  assert.ok(email.text.includes("Message/Advice:\nCan't wait to play some board games!"));
  assert.ok(!email.text.includes("Dietary Restrictions"));
  assert.ok(!email.text.includes("Song Suggestion"));
});

test("onRsvpCreated trigger for attending = no", async (t) => {
  mockSendMail.clear();
  mockAppendCalls = [];

  const mockDate = new Date("2026-05-21T12:00:00Z");
  const mockEvent = {
    data: {
      data: () => ({
        name: "Bob Jones",
        email: "bob@example.com",
        attending: "no",
        guests: 0,
        advice: "Sending warm wishes!",
        timestamp: {
          toDate: () => mockDate
        }
      })
    }
  };

  await onRsvpCreatedHandler(mockEvent);

  // Assert Sheets integration
  assert.strictEqual(mockAppendCalls.length, 1);
  const values = mockAppendCalls[0].resource.values[0];
  assert.strictEqual(values[1], "Bob Jones");
  assert.strictEqual(values[3], "No");
  assert.strictEqual(values[4], 0);
  assert.strictEqual(values[5], "Sending warm wishes!");
  assert.strictEqual(values.length, 6);

  // Assert Email Integration
  const sent = mockSendMail.getSent();
  assert.strictEqual(sent.length, 1);
  const email = sent[0];
  assert.ok(email.subject.includes("Bob Jones is Not Attending"));
  assert.ok(email.text.includes("Name: Bob Jones"));
  assert.ok(email.text.includes("Number of Guests: 0"));
  assert.ok(!email.text.includes("Dietary Restrictions"));
  assert.ok(!email.text.includes("Song Suggestion"));
});
