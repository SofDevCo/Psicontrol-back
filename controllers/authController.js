const { google } = require("googleapis");
const { User, Calendar, Event, Customer } = require("../models");
const Fuse = require("fuse.js");
const { listCalendars } = require("../services/calendarService");
const { parseISO, format } = require("date-fns");
const { oauth2Client, authUrl } = require("../config/oauth2");
const { saveTokens } = require("./tokenController");
const { updateConsultationDays } = require("../utils/updateFunctions");
const calendar = google.calendar({ version: "v3", auth: oauth2Client });
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const CLIENT_TIMEZONE = "America/Sao_Paulo";

const fetchGoogleCalendars = async (accessToken) => {
  oauth2Client.setCredentials({ access_token: accessToken });
  const response = await calendar.calendarList.list();
  return response.data.items;
};

const fetchGoogleCalendarEvents = async (accessToken, calendarId) => {
  oauth2Client.setCredentials({ access_token: accessToken });

  const now = new Date();
  const twoMonthsBefore = new Date();
  const twoMonthsAfter = new Date();

  twoMonthsBefore.setMonth(now.getMonth() - 2);
  twoMonthsAfter.setMonth(now.getMonth() + 2);

  const response = await calendar.events.list({
    calendarId: calendarId,
    timeMin: twoMonthsBefore.toISOString(),
    timeMax: twoMonthsAfter.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  return response.data.items.map((event) => ({
    ...event,
    start: {
      ...event.start,
      dateTime: event.start.dateTime
        ? new Date(event.start.dateTime).toISOString()
        : null,
    },
  }));
};

const syncGoogleCalendarWithDatabase = async (accessToken) => {
  oauth2Client.setCredentials({ access_token: accessToken });
  const calendars = await fetchGoogleCalendars(accessToken);
  const user = await User.findOne({ where: { access_token: accessToken } });

  for (const calendar of calendars) {
    const calendarId = calendar.id;

    let dbCalendar = await Calendar.findOne({
      where: { calendar_id: calendarId, user_id: user.user_id },
    });

    if (!dbCalendar) {
      dbCalendar = await Calendar.create({
        calendar_id: calendarId,
        calendar_name: calendar.summary,
        user_id: user.user_id,
        enabled: false,
      });
    }

    const events = await fetchGoogleCalendarEvents(accessToken, calendarId);
    const unmatchedEvents = [];
    const processedEvents = new Set();

    for (const event of events) {
      const summary = event.summary?.trim() || "Evento Sem Título";
      const uniqueKey = `${summary}_${
        event.start?.date || event.start?.dateTime?.split("T")[0]
      }`;

      if (processedEvents.has(uniqueKey)) continue;
      processedEvents.add(uniqueKey);

      const existingEvents = await Event.findAll({
        where: { google_event_id: event.id, user_id: user.user_id },
      });

      if (!event.summary) console.warn("Evento sem summary:", event);

      let patients = await Customer.findAll({
        where: { deleted: false, user_id: user.user_id },
      });

      const cleanSummary = summary.replace(/^Paciente - /i, "").trim();

      let bestMatch = patients.find(
        (p) =>
          p.customer_calendar_name
            .replace(/^Paciente - /i, "")
            .trim()
            .toLowerCase() === cleanSummary.toLowerCase()
      );

      if (!bestMatch) {
        const cleanPatients = patients.map((p) => ({
          ...p,
          customer_calendar_name: p.customer_calendar_name
            .replace(/^Paciente - /i, "")
            .trim(),
        }));

        const fuse = new Fuse(cleanPatients, {
          keys: ["customer_calendar_name"],
          threshold: 0.05,
          distance: 100,
          findAllMatches: true,
        });

        const result = fuse.search(cleanSummary);
        bestMatch = result.length > 0 ? result[0].item : null;
      }

      let customerId = bestMatch ? bestMatch.customer_id : null;

      let startDate = null,
        startTime = null,
        endTime = null;

      if (event.start?.dateTime) {
        const dateTime = event.start.dateTime;
        startDate = format(parseISO(dateTime), "yyyy-MM-dd");
        startTime = dateTime.split("T")[1].split(":").slice(0, 2).join(":");
        endTime = event.end?.dateTime
          ? event.end.dateTime.split("T")[1].split(":").slice(0, 2).join(":")
          : startTime;
      } else if (event.start?.date) {
        startDate = event.start.date;
      }

      const userId = user.user_id;

      const eventExistsForUser = existingEvents.some(
        (e) => e.user_id === userId
      );

      if (!eventExistsForUser) {
        await Event.create({
          event_name: summary,
          date: startDate,
          google_event_id: event.id,
          status:
            existingEvents.length > 0 &&
            existingEvents[0].status === "cancelado"
              ? "cancelado"
              : event.status,
          calendar_id: calendarId,
          start_time: startTime,
          end_time: endTime,
          user_id: userId,
          customer_id: customerId,
        });
      }

      if (customerId) {
        await updateConsultationDays(customerId);
      } else {
        unmatchedEvents.push({
          event_name: summary,
          date: startDate,
          user_id: userId,
        });
      }
    }

    global.unmatchedEventsCache = unmatchedEvents;
    await deleteNonexistentGoogleEvents(events, calendarId, user.user_id);
  }
};

const deleteNonexistentGoogleEvents = async (events, calendarId, userId) => {
  const googleEventIds = events.map((event) => event.id);

  const allDbEvents = await Event.findAll({
    where: { calendar_id: calendarId, user_id: userId },
  });

  for (const dbEvent of allDbEvents) {
    if (!googleEventIds.includes(dbEvent.google_event_id)) {
      await dbEvent.update({ status: "cancelado" });
    }
  }
};

const initiateGoogleAuth = (req, res) => {
  res.json({ authUrl });
};

async function handleOAuth2Callback(req, res) {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send("Código de autorização ausente.");
  }

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials({ access_token: tokens.access_token });

  const calendars = await listCalendars();

  let oauth2 = google.oauth2({
    auth: oauth2Client,
    version: "v2",
  });

  const { data } = await oauth2.userinfo.get();

  if (!data.email) {
    return res.status(400).json({
      statusCode: 400,
      message: "Email não encontrado.",
    });
  }

  await saveTokens(
    data.name,
    data.email,
    tokens.access_token,
    tokens.refresh_token
  );

  const authenticationToken = uuidv4();

  const user = await User.findOne({ where: { user_email: data.email } });
  user.autentication_token = authenticationToken;
  await user.save();

  await syncGoogleCalendarWithDatabase(tokens.access_token);

  res.redirect(
    `${process.env.FRONTEND_URL}/token?token=${authenticationToken}`
  );
}

const checkAndHandleCalendars = async (req, res) => {
  const userId = req.user?.user_id;

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado." });
  }

  const enabledCalendars = await Calendar.findAll({
    where: { user_id: userId, enabled: true },
  });

  if (!enabledCalendars || enabledCalendars.length === 0) {
    return res.json({ redirect: "/select-calendar" });
  }

  const calendarIds = enabledCalendars.map((calendar) => calendar.calendar_id);

  return res.json({
    redirect: `/create-event-form?calendarIds=${calendarIds.join(",")}`,
  });
};

module.exports = {
  handleOAuth2Callback,
  initiateGoogleAuth,
  syncGoogleCalendarWithDatabase,
  fetchGoogleCalendarEvents,
  fetchGoogleCalendars,
  checkAndHandleCalendars,
};
