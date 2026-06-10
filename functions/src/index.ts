import * as admin from "firebase-admin";
import { getMessaging } from "firebase-admin/messaging";
import { google } from "googleapis";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";

admin.initializeApp();

const db = admin.firestore();
db.settings({ 
  databaseId: "ai-studio-f0fbd47e-303b-40fe-88c1-505382c75ba3" 
});

// Secrets
const serviceAccountSecret = defineSecret("GOOGLE_SERVICE_ACCOUNT_JSON");
const workCalendarIdSecret = defineSecret("WORK_CALENDAR_ID");
const familyCalendarIdSecret = defineSecret("FAMILY_CALENDAR_ID");

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

      } catch (error: any) {
        // CHANGED: If API throws 404 error, log and continue, do not crash
        if (error && (error.code === 404 || error.status === 404)) {
          logger.warn("Google Calendar API returned 404 (calendar or event not found). Continuing...", error);
        } else {
          logger.error("Error in onBookingConfirmed:", error);
        }
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
      } catch (error: any) {
        // CHANGED: If API throws 404 error, log and continue, do not crash
        if (error && (error.code === 404 || error.status === 404)) {
          logger.warn(`Google Calendar API returned 404 for event ${after.calendarEventId} in booking ${event.params.bookingId}. Continuing...`, error);
        } else {
          logger.error(`Error in onBookingRescheduled for event ${after.calendarEventId}:`, error);
        }
      }
    }
  }
);

export const getBlockedSlots = onCall(
  {
    secrets: [serviceAccountSecret, familyCalendarIdSecret, workCalendarIdSecret],
    region: "us-central1"
  },
  async (request) => {
    // CHANGED: Auth check added to prevent unauthenticated access
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login required");
    }

    const { dateFrom, dateTo } = request.data;
    // dateFrom, dateTo: "YYYY-MM-DD" strings

    if (!dateFrom || !dateTo) {
      throw new HttpsError("invalid-argument", "Missing dateFrom or dateTo");
    }

    try {
      const calendar = await getCalendarClient(serviceAccountSecret.value());

      const timeMin = new Date(dateFrom + 'T00:00:00').toISOString();
      const timeMax = new Date(dateTo + 'T23:59:59').toISOString();

      // Fetch from both calendars
      const calendarIds = [
        workCalendarIdSecret.value(),
        familyCalendarIdSecret.value()
      ];

      const allEvents: { start: string; end: string }[] = [];

      for (const calendarId of calendarIds) {
        try {
          const response = await calendar.events.list({
            calendarId,
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime'
          });

          const events = response.data.items || [];
          for (const event of events) {
            const start = event.start?.dateTime || event.start?.date;
            const end = event.end?.dateTime || event.end?.date;
            if (start && end) {
              allEvents.push({ start, end });
            }
          }
        } catch (error: any) {
          // CHANGED: If API throws 404 error, log and continue, do not crash
          if (error && (error.code === 404 || error.status === 404)) {
            logger.warn(`Google Calendar API returned 404 for calendar ${calendarId}. Continuing...`, error);
          } else {
            logger.error(`Error listing events for calendar ${calendarId}:`, error);
            throw error;
          }
        }
      }

      return { events: allEvents };
    } catch (error) {
      logger.error("Error in getBlockedSlots:", error);
      throw new HttpsError("internal", "Failed to fetch calendar events");
    }
  }
);

export const onNewBooking = onDocumentCreated(
  {
    document: "bookings/{bookingId}",
    database: "ai-studio-f0fbd47e-303b-40fe-88c1-505382c75ba3",
  },
  async (event) => {
    const booking = event.data?.data();
    if (!booking) return;

    // CHANGED: Sanitize potential untrusted inputs (booking.name and booking.phone)
    const name = typeof booking.name === "string" ? booking.name.trim().slice(0, 50) : "";
    const phone = typeof booking.phone === "string" ? booking.phone.trim().slice(0, 50) : "";

    try {
      const tokensSnap = await db.collection('pushTokens').get();
      if (tokensSnap.empty) return;

      const sends = tokensSnap.docs.map(async (tokenDoc) => {
        const { token } = tokenDoc.data();
        try {
          await getMessaging().send({
            token,
            notification: {
              title: 'Nová objednávka',
              body: `${name} – ${booking.preferredDate} o ${booking.preferredTime}`
            },
            webpush: {
              notification: {
                icon: 'https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0463998550.firebasestorage.app/o/public%2Flogo.png?alt=media&token=41ca22c4-cbbc-4b1b-9ba1-7b178e3baef5',
                badge: 'https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0463998550.firebasestorage.app/o/public%2Flogo.png?alt=media&token=41ca22c4-cbbc-4b1b-9ba1-7b178e3baef5',
                click_action: 'https://spservis.pages.dev',
                vibrate: [200, 100, 200],
                requireInteraction: true
              },
              fcmOptions: {
                link: 'https://spservis.pages.dev'
              }
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1
                }
              }
            }
          });
        } catch (err: any) {
          if (err.code === 'messaging/registration-token-not-registered' ||
              err.code === 'messaging/invalid-registration-token') {
            await tokenDoc.ref.delete();
            logger.info(`Deleted expired token: ${tokenDoc.id}`);
          } else {
            logger.error(`Push error for token ${tokenDoc.id}:`, err);
          }
        }
      });

      await Promise.allSettled(sends);
      logger.info(`Push sent to ${tokensSnap.size} devices for booking ${event.params.bookingId}`);
    } catch (error) {
      logger.error('onNewBooking error:', error);
    }
  }
);



