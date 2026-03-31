import * as admin from "firebase-admin";
import { google } from "googleapis";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";

admin.initializeApp();

const db = admin.firestore();
db.settings({ 
  databaseId: "ai-studio-f0fbd47e-303b-40fe-88c1-505382c75ba3" 
});

// Secrets
const googleClientId = defineSecret("GOOGLE_CLIENT_ID");
const googleClientSecret = defineSecret("GOOGLE_CLIENT_SECRET");
const oauthRedirectUri = defineSecret("OAUTH_REDIRECT_URI");
const appUrl = defineSecret("APP_URL");
const workCalendarId = defineSecret("WORK_CALENDAR_ID");
const familyCalendarId = defineSecret("FAMILY_CALENDAR_ID");
const personalCalendarId = defineSecret("PERSONAL_CALENDAR_ID");

/**
 * Helper to get authorized Google Calendar client
 */
async function getCalendarClient(clientId: string, clientSecret: string) {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  const tokensDoc = await db.doc("appConfig/googleCalendarTokens").get();
  if (!tokensDoc.exists) {
    throw new Error("Google Calendar tokens not found in Firestore");
  }
  const tokens = tokensDoc.data();
  oauth2Client.setCredentials(tokens!);
  return google.calendar({ version: "v3", auth: oauth2Client });
}

/**
 * FUNKCIA 1 — onBookingConfirmed
 * Triggered when a booking status changes to 'confirmed'
 */
export const onBookingConfirmed = onDocumentUpdated(
  { 
    document: "bookings/{bookingId}", 
    secrets: [googleClientId, googleClientSecret, workCalendarId] 
  }, 
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) {
      logger.warn("No data found in booking update event.");
      return;
    }

    // Check if status changed to 'confirmed'
    if (after.status === "confirmed" && before.status !== "confirmed") {
      logger.info(`Booking ${event.params.bookingId} confirmed. Creating calendar event...`);
      
      try {
        const calendar = await getCalendarClient(googleClientId.value(), googleClientSecret.value());
        
        const startDateTime = `${after.preferredDate}T${after.preferredTime}:00`;
        const endDateTime = new Date(new Date(startDateTime).getTime() + 120 * 60 * 1000).toISOString();

        const calendarEvent = {
          summary: `Servis SP THERM - ${after.name}`,
          location: after.address,
          description: `Meno: ${after.name}\nAdresa: ${after.address}\nTelefón: ${after.phone}\nPoznámka: ${after.notes || ""}`,
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
          calendarId: workCalendarId.value(),
          requestBody: calendarEvent,
        });

        const calendarEventId = response.data.id;
        logger.info(`Calendar event created: ${calendarEventId}`);

        // Update booking with calendar event ID
        await event.data!.after.ref.update({
          calendarEventId: calendarEventId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      } catch (error) {
        logger.error("Error in onBookingConfirmed:", error);
      }
    }
  }
);

/**
 * FUNKCIA 2 — syncCalendarSlots
 * Scheduled every 60 minutes to sync busy slots from Google Calendar
 */
export const syncCalendarSlots = onSchedule(
  { 
    schedule: "every 60 minutes",
    secrets: [googleClientId, googleClientSecret, workCalendarId, familyCalendarId, personalCalendarId] 
  }, 
  async (event) => {
    await syncCalendarSlotsInternal();
  }
);

/**
 * FUNKCIA 5 — manualSyncCalendarSlots
 * HTTP endpoint to manually trigger calendar synchronization
 */
export const manualSyncCalendarSlots = onRequest(
  { 
    secrets: [googleClientId, googleClientSecret, workCalendarId, familyCalendarId, personalCalendarId] 
  }, 
  async (req, res) => {
    try {
      logger.info("Manual calendar sync triggered.");
      await syncCalendarSlotsInternal();
      res.json({ status: "success", message: "Calendar slots synchronized successfully." });
    } catch (error) {
      logger.error("Error in manualSyncCalendarSlots:", error);
      res.status(500).json({ status: "error", message: "Failed to synchronize calendar slots." });
    }
  }
);

/**
 * Internal logic for calendar synchronization
 */
async function syncCalendarSlotsInternal() {
  logger.info("Starting calendar slots sync...");
  
  try {
    const calendar = await getCalendarClient(googleClientId.value(), googleClientSecret.value());
    
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ahead

    const calendarsToSync = [
      { id: workCalendarId.value(), name: "WORK" },
      { id: familyCalendarId.value(), name: "FAMILY" },
      { id: personalCalendarId.value(), name: "PERSONAL" }
    ];

    const blockedSlots: { date: string; time: string; reason: string }[] = [];

    // 1. Add lunch break for the next 30 days (12:00)
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      blockedSlots.push({ date: dateStr, time: "12:00", reason: "lunch_break" });
    }

    // 2. Fetch events from calendars
    for (const cal of calendarsToSync) {
      if (!cal.id) continue;
      
      logger.info(`Fetching events for ${cal.name} calendar...`);
      const response = await calendar.events.list({
        calendarId: cal.id,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = response.data.items || [];
      
      if (cal.name === "WORK") {
        // WORK calendar logic (120 min duration)
        events.forEach(item => {
          if (item.start?.dateTime) {
            const start = new Date(item.start.dateTime);
            const date = start.toISOString().split("T")[0];
            const time = start.toTimeString().split(" ")[0].substring(0, 5);
            
            blockedSlots.push({ date, time, reason: "reservation" });
            
            // Block the next hour too (120 min total)
            const nextHour = new Date(start.getTime() + 60 * 60 * 1000);
            const nextTime = nextHour.toTimeString().split(" ")[0].substring(0, 5);
            blockedSlots.push({ date, time: nextTime, reason: "reservation_buffer" });
          }
        });
      } else {
        // FAMILY and PERSONAL logic (Duration + 60 min buffer)
        events.forEach(item => {
          if (item.start?.dateTime && item.end?.dateTime) {
            const start = new Date(item.start.dateTime);
            const end = new Date(item.end.dateTime);
            const bufferedEnd = new Date(end.getTime() + 60 * 60 * 1000); // 1h buffer

            // Working slots: 07:00 to 16:00
            const possibleSlots = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
            const eventDate = start.toISOString().split("T")[0];
            
            possibleSlots.forEach(slotTime => {
              const [h, m] = slotTime.split(":").map(Number);
              const slotStart = new Date(start);
              slotStart.setHours(h, m, 0, 0);
              const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

              if (slotStart < bufferedEnd && slotEnd > start) {
                blockedSlots.push({ date: eventDate, time: slotTime, reason: "other_event" });
              }
            });
          }
        });
      }
    }

    logger.info(`Syncing ${blockedSlots.length} slots to Firestore...`);

    const slotsRef = db.collection("slots");
    const batch = db.batch();

    // Delete old slots
    const oldSlots = await slotsRef.get();
    oldSlots.forEach(doc => batch.delete(doc.ref));

    // Add new slots
    blockedSlots.forEach(slot => {
      const id = `${slot.date}_${slot.time.replace(":", "")}`;
      batch.set(slotsRef.doc(id), {
        ...slot,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
    logger.info("Calendar slots sync completed successfully.");

  } catch (error) {
    logger.error("Error in syncCalendarSlotsInternal:", error);
    throw error;
  }
}

/**
 * FUNKCIA 3 — googleAuthCallback
 * HTTP endpoint for Google OAuth2 callback
 */
export const googleAuthCallback = onRequest(
  { 
    secrets: [googleClientId, googleClientSecret, oauthRedirectUri, appUrl] 
  }, 
  async (req, res) => {
    const code = req.query.code as string;
    
    if (!code) {
      res.status(400).send("Chýba authorization code");
      return;
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        googleClientId.value(),
        googleClientSecret.value()
      );

      const { tokens } = await oauth2Client.getToken({
        code,
        redirect_uri: oauthRedirectUri.value()
      });
      
      oauth2Client.setCredentials(tokens);
      
      // Ulož tokeny do Firestore
      await db.doc("appConfig/googleCalendarTokens").set({
        ...tokens,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      logger.info("Google Calendar tokens successfully updated via OAuth callback.");
      
      // Presmeruj späť do aplikácie
      res.redirect(appUrl.value() + "?calendar=connected");
      
    } catch (error) {
      logger.error("OAuth callback error:", error);
      res.redirect(appUrl.value() + "?calendar=error");
    }
  }
);

/**
 * FUNKCIA 4 — getGoogleAuthUrl
 * HTTP endpoint to generate Google OAuth2 authorization URL
 */
export const getGoogleAuthUrl = onRequest(
  { 
    secrets: [googleClientId, googleClientSecret, oauthRedirectUri] 
  }, 
  async (req, res) => {
    try {
      const oauth2Client = new google.auth.OAuth2(
        googleClientId.value(),
        googleClientSecret.value()
      );

      const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [
          "https://www.googleapis.com/auth/calendar.events",
          "https://www.googleapis.com/auth/calendar.readonly"
        ],
        redirect_uri: oauthRedirectUri.value()
      });
      res.json({ url });
    } catch (error) {
      logger.error("Error generating auth URL:", error);
      res.status(500).send("Chyba pri generovaní URL");
    }
  }
);
