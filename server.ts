import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { google } from "googleapis";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, query, getDocs, deleteDoc, writeBatch } from "firebase/firestore";
import fs from "fs";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app_firebase = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app_firebase, firebaseConfig.firestoreDatabaseId);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "138673940716-gesjk0mbmf47qmp0n8rdvm48qk88ok5n.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "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";
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || (process.env.APP_URL ? `${process.env.APP_URL}/api/auth/google/callback` : "http://localhost:3000/api/auth/google/callback");

const CALENDARS = {
  RESERVATIONS: "sp24therm@gmail.com",
  FAMILY: "7cb370e4cb78a87bfd9f339e2545bb8bdbeca73d548a35dc68ee515aa5aba3a4@group.calendar.google.com",
  PRIVATE: "scepanpeter@gmail.com"
};

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // API Routes
  app.get(["/api/auth/google", "/api/auth/google/url"], (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.readonly"
      ]
    });
    res.redirect(url);
  });

  async function getAuthorizedClient() {
    const tokensDoc = await getDoc(doc(db, "settings", "google_calendar_tokens"));
    if (!tokensDoc.exists()) {
      return null;
    }

    const tokens = tokensDoc.data();
    oauth2Client.setCredentials(tokens);

    // Check if access token is expired and refresh if necessary
    oauth2Client.on('tokens', async (newTokens) => {
      if (newTokens.refresh_token) {
        // Store updated tokens
        await setDoc(doc(db, "settings", "google_calendar_tokens"), {
          ...tokens,
          ...newTokens,
          updatedAt: new Date().toISOString()
        });
      } else {
        await setDoc(doc(db, "settings", "google_calendar_tokens"), {
          ...tokens,
          ...newTokens,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    });

    return google.calendar({ version: "v3", auth: oauth2Client });
  }

  app.get("/api/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      
      // Store tokens in Firestore
      await setDoc(doc(db, "settings", "google_calendar_tokens"), {
        ...tokens,
        updatedAt: new Date().toISOString()
      });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.post("/api/auth/google/sync-tokens", async (req, res) => {
    const { accessToken, refreshToken, expiryDate } = req.body;
    try {
      if (!accessToken) {
        return res.status(400).json({ error: "Missing access token" });
      }

      const tokens: any = {
        access_token: accessToken,
        updatedAt: new Date().toISOString()
      };

      if (refreshToken) tokens.refresh_token = refreshToken;
      if (expiryDate) tokens.expiry_date = expiryDate;

      await setDoc(doc(db, "settings", "google_calendar_tokens"), tokens, { merge: true });
      res.json({ success: true });
    } catch (error) {
      console.error("Error syncing tokens:", error);
      res.status(500).json({ error: "Failed to sync tokens" });
    }
  });

  async function syncGoogleCalendar() {
    try {
      const tokensDoc = await getDoc(doc(db, "settings", "google_calendar_tokens"));
      const tokens = tokensDoc.data();
      console.log("Token exists:", tokensDoc.exists());
      console.log("Using token for account:", tokens?.email || "unknown");

      const calendar = await getAuthorizedClient();
      if (!calendar) return [];
      
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ahead

      console.log("Searching from:", timeMin);
      console.log("Searching to:", timeMax);

      // Fetch events from all 3 calendars with individual try/catch
      let resEvents: any, familyEvents: any, privateEvents: any;

      try {
        resEvents = await calendar.events.list({ calendarId: CALENDARS.RESERVATIONS, timeMin, timeMax, singleEvents: true });
        console.log("RESERVATIONS events:", resEvents.data.items?.length || 0);
      } catch (e) {
        console.error("Error fetching RESERVATIONS calendar:", e);
      }

      try {
        familyEvents = await calendar.events.list({ calendarId: CALENDARS.FAMILY, timeMin, timeMax, singleEvents: true });
        console.log("FAMILY events:", familyEvents.data.items?.length || 0);
      } catch (e) {
        console.error("Error fetching FAMILY calendar:", e);
      }

      try {
        privateEvents = await calendar.events.list({ calendarId: CALENDARS.PRIVATE, timeMin, timeMax, singleEvents: true });
        console.log("PRIVATE events:", privateEvents.data.items?.length || 0);
      } catch (e) {
        console.error("Error fetching PRIVATE calendar:", e);
      }

      // Defensive check for each response structure
      if (!resEvents?.data?.items || !familyEvents?.data?.items || !privateEvents?.data?.items) {
        console.warn("Google Calendar API returned incomplete data or no items");
        // If any of the critical data structures are missing, return empty list to avoid crashes
        if (!resEvents?.data || !resEvents.data.items) return [];
        if (!familyEvents?.data || !familyEvents.data.items) return [];
        if (!privateEvents?.data || !privateEvents.data.items) return [];
      }

      const blockedSlots: { date: string; time: string; reason: string }[] = [];

    // Add hardcoded lunch break for the next 30 days
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      blockedSlots.push({ date: dateStr, time: "12:00", reason: "lunch_break" });
    }

    // Logic for REZERVÁCIE (120 min duration)
    resEvents.data.items?.forEach(event => {
      if (event.start?.dateTime) {
        const start = new Date(event.start.dateTime);
        const date = start.toISOString().split("T")[0];
        const time = start.toTimeString().split(" ")[0].substring(0, 5);
        
        blockedSlots.push({ date, time, reason: "reservation" });
        
        // Block the next hour too (120 min total)
        const nextHour = new Date(start.getTime() + 60 * 60 * 1000);
        const nextTime = nextHour.toTimeString().split(" ")[0].substring(0, 5);
        blockedSlots.push({ date, time: nextTime, reason: "reservation_buffer" });
      }
    });

    // Logic for RODINA and SÚKROMNÝ (Duration + 60 min buffer)
    const otherEvents = [...(familyEvents.data.items || []), ...(privateEvents.data.items || [])];
    otherEvents.forEach(event => {
      if (event.start?.dateTime && event.end?.dateTime) {
        const start = new Date(event.start.dateTime);
        const end = new Date(event.end.dateTime);
        const bufferedEnd = new Date(end.getTime() + 60 * 60 * 1000); // 1h buffer

        // Find all slots that overlap with [start, bufferedEnd]
        // Working slots: 07:00, 08:00, 09:00, 10:00, 11:00, 13:00, 14:00, 15:00, 16:00
        const possibleSlots = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
        
        const eventDate = start.toISOString().split("T")[0];
        
        possibleSlots.forEach(slotTime => {
          const [h, m] = slotTime.split(":").map(Number);
          const slotStart = new Date(start);
          slotStart.setHours(h, m, 0, 0);
          const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

          // Overlap check
          if (slotStart < bufferedEnd && slotEnd > start) {
            blockedSlots.push({ date: eventDate, time: slotTime, reason: "other_event" });
          }
        });
      }
    });

    // Sync to Firestore 'slots' collection
    const slotsRef = collection(db, "slots");
    const batch = writeBatch(db);
    
    // Clear existing slots for the next 30 days
    const existingSlots = await getDocs(query(slotsRef));
    existingSlots.forEach(doc => batch.delete(doc.ref));
    
    // Add new blocked slots
    blockedSlots.forEach(slot => {
      const id = `${slot.date}_${slot.time.replace(":", "")}`;
      batch.set(doc(slotsRef, id), {
        ...slot,
        updatedAt: new Date().toISOString()
      });
    });

    await batch.commit();
    return blockedSlots;
    } catch (error) {
      console.warn("Error syncing calendar:", error);
      return [];
    }
  }

  app.post("/api/calendar/sync", async (req, res) => {
    try {
      const blockedSlots = await syncGoogleCalendar();
      // Ensure we always have an array before accessing .length (Fix for line 231 crash)
      const safeSlots = blockedSlots || [];
      res.json({ success: true, count: safeSlots.length });
    } catch (error) {
      console.warn("Error in /api/calendar/sync:", error);
      res.json({ success: false, count: 0 });
    }
  });

  app.post("/api/calendar/create-event", async (req, res) => {
    const { booking } = req.body;
    try {
      const calendar = await getAuthorizedClient();
      
      const startDateTime = `${booking.preferredDate}T${booking.preferredTime}:00`;
      const endDateTime = new Date(new Date(startDateTime).getTime() + 120 * 60 * 1000).toISOString();

      const event = {
        summary: `Servis SP THERM - ${booking.name}`,
        location: booking.address,
        description: `Meno: ${booking.name}\nAdresa: ${booking.address}\nTelefón: ${booking.phone}\nPoznámka: ${booking.notes || ""}`,
        start: {
          dateTime: new Date(startDateTime).toISOString(),
          timeZone: "Europe/Bratislava",
        },
        end: {
          dateTime: endDateTime,
          timeZone: "Europe/Bratislava",
        },
      };

      const response = await calendar.events.insert({
        calendarId: CALENDARS.RESERVATIONS,
        requestBody: event,
      });

      res.json({ success: true, eventId: response.data.id });
    } catch (error) {
      console.error("Error creating calendar event:", error);
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Initial sync on start
    setTimeout(async () => {
      try {
        console.log("Running initial calendar sync...");
        await syncGoogleCalendar();
        console.log("Initial calendar sync completed.");
      } catch (e) {
        console.error("Initial sync failed:", e);
      }
    }, 5000);
  });
}

startServer();
