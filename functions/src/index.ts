import * as admin from "firebase-admin";
import { google } from "googleapis";
import { logger } from "firebase-functions";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";

admin.initializeApp();

const db = admin.firestore();
db.settings({ 
  databaseId: "ai-studio-f0fbd47e-303b-40fe-88c1-505382c75ba3" 
});

// Environment variables
const WORK_CALENDAR_ID = process.env.WORK_CALENDAR_ID;
const FAMILY_CALENDAR_ID = process.env.FAMILY_CALENDAR_ID;
const PERSONAL_CALENDAR_ID = process.env.PERSONAL_CALENDAR_ID;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET
);

/**
 * Helper to get authorized Google Calendar client
 */
async function getCalendarClient() {
  const tokensDoc = await db.doc("settings/google_calendar_tokens").get();
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
export const onBookingConfirmed = onDocumentUpdated("bookings/{bookingId}", async (event) => {
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
      const calendar = await getCalendarClient();
      
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
        calendarId: WORK_CALENDAR_ID,
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
});

/**
 * FUNKCIA 2 — syncCalendarSlots
 * Scheduled every 60 minutes to sync busy slots from Google Calendar
 */
export const syncCalendarSlots = onSchedule("every 60 minutes", async (event) => {
  logger.info("Starting calendar slots sync...");
  
  try {
    const calendar = await getCalendarClient();
    
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ahead

    const calendarsToSync = [
      { id: WORK_CALENDAR_ID, name: "WORK" },
      { id: FAMILY_CALENDAR_ID, name: "FAMILY" },
      { id: PERSONAL_CALENDAR_ID, name: "PERSONAL" }
    ];

    const blockedSlots: { date: string; time: string; reason: string }[] = [];

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
      events.forEach(item => {
        if (item.start?.dateTime) {
          const start = new Date(item.start.dateTime);
          const date = start.toISOString().split("T")[0];
          const time = start.toTimeString().split(" ")[0].substring(0, 5);
          
          blockedSlots.push({
            date,
            time,
            reason: "calendar_event"
          });
        }
      });
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
    logger.error("Error in syncCalendarSlots:", error);
  }
});
