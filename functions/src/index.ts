import * as admin from "firebase-admin";
import { google } from "googleapis";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";

admin.initializeApp();

const db = admin.firestore();
db.settings({ 
  databaseId: "ai-studio-f0fbd47e-303b-40fe-88c1-505382c75ba3" 
});

// Secrets
const serviceAccountSecret = defineSecret("GOOGLE_SERVICE_ACCOUNT_JSON");
const workCalendarIdSecret = defineSecret("WORK_CALENDAR_ID");

async function getCalendarClient(serviceAccountJson: string) {
  const credentials = JSON.parse(serviceAccountJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
  });
  return google.calendar({ version: "v3", auth });
}

/**
 * FUNKCIA — onBookingConfirmed
 * Triggered when a booking status changes to 'confirmed'
 */
export const onBookingConfirmed = onDocumentUpdated(
  { 
    document: "bookings/{bookingId}", 
    database: "ai-studio-f0fbd47e-303b-40fe-88c1-505382c75ba3",
    secrets: [serviceAccountSecret, workCalendarIdSecret] 
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
        const calendar = await getCalendarClient(serviceAccountSecret.value());
        
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
          calendarId: workCalendarIdSecret.value(),
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
 * FUNKCIA — onBookingRescheduled
 * Triggered when a booking is rescheduled (its date or time changes) and has an associated calendar event ID
 */
export const onBookingRescheduled = onDocumentUpdated(
  {
    document: "bookings/{bookingId}",
    database: "ai-studio-f0fbd47e-303b-40fe-88c1-505382c75ba3",
    secrets: [serviceAccountSecret, workCalendarIdSecret]
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) {
      logger.warn("No data found in booking update event.");
      return;
    }

    // Fire only when BOTH conditions are true:
    // 1. booking has calendarEventId (was already added to calendar)
    // 2. preferredDate OR preferredTime changed between before and after
    if (after.calendarEventId && 
        (before.preferredDate !== after.preferredDate || before.preferredTime !== after.preferredTime)) {
      
      logger.info(`Booking ${event.params.bookingId} rescheduled/updated. Updating Google Calendar event ${after.calendarEventId}...`);
      
      try {
        const calendar = await getCalendarClient(serviceAccountSecret.value());
        
        const startDateTime = `${after.preferredDate}T${after.preferredTime}:00`;
        const endDateTime = new Date(new Date(startDateTime).getTime() + 120 * 60 * 1000).toISOString();

        await calendar.events.patch({
          calendarId: workCalendarIdSecret.value(),
          eventId: after.calendarEventId,
          requestBody: {
            start: {
              dateTime: new Date(startDateTime).toISOString(),
              timeZone: "Europe/Bratislava",
            },
            end: {
              dateTime: endDateTime,
              timeZone: "Europe/Bratislava",
            },
          },
        });

        logger.info(`Calendar event ${after.calendarEventId} updated successfully.`);
      } catch (error) {
        logger.error(`Error in onBookingRescheduled for event ${after.calendarEventId}:`, error);
      }
    }
  }
);

