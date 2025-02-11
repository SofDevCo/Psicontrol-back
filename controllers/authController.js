const { google } = require("googleapis");
const { User, Calendar, Event, Customer } = require("../models");
const Fuse = require("fuse.js");
const { listCalendars } = require("../services/calendarService");
const { parseISO, format } = require("date-fns");
const { oauth2Client, authUrl } = require("../config/oauth2");
const { saveTokens } = require("./tokenController");
const { updateConsultationDays } = require("../utils/updateConsultationDays");
const calendar = google.calendar({ version: "v3", auth: oauth2Client });
const bcrypt = require("bcrypt");
const CLIENT_TIMEZONE = "America/Sao_Paulo";

const fetchGoogleCalendars = async (accessToken) => {
  oauth2Client.setCredentials({ access_token: accessToken });

  try {
    const response = await calendar.calendarList.list();
    return response.data.items;
  } catch (error) {}
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

  for (const calendar of calendars) {
    const calendarId = calendar.id;

    const dbCalendar = await Calendar.findOne({
      where: { calendar_id: calendarId },
    });

    const user = await User.findOne({ where: { access_token: accessToken } });

    if (!dbCalendar) {
      await Calendar.create({
        calendar_id: calendarId,
        calendar_name: calendar.summary,
        user_id: user.user_id,
        enabled: false,
      });
    }

    const events = await fetchGoogleCalendarEvents(accessToken, calendarId);
    const patients = await Customer.findAll();

    const fuse = new Fuse(patients, {
      keys: ["customer_name"],
      threshold: 0.3,
    });

    const unmatchedEvents = [];

    const processedEvents = new Set();

    for (const event of events) {
      const summary = event.summary?.trim() || "Evento Sem Título";

      const uniqueKey = `${summary}_${
        event.start?.date || event.start?.dateTime?.split("T")[0]
      }`;
      if (processedEvents.has(uniqueKey)) {
        continue;
      }
      processedEvents.add(uniqueKey);

      const eventExists = await Event.findOne({
        where: { google_event_id: event.id },
      });

      if (!event.summary) {
        console.warn("Evento sem summary:", event);
      }

      const cleanedSummary = summary.replace(/^Paciente\s*-\s*/, "");

      const result = fuse.search(cleanedSummary);
      const bestMatch = result.length > 0 ? result[0].item : null;
      const customerId = bestMatch ? bestMatch.customer_id : null;

      let startDate = null,
        startTime = null,
        endTime = null;

      if (event.start && event.start.dateTime) {
        const dateTime = event.start.dateTime;
        if (dateTime) {
          startDate = format(parseISO(dateTime), "yyyy-MM-dd");
          startTime = dateTime.split("T")[1].split(":").slice(0, 2).join(":");

          if (event.end && event.end.dateTime) {
            endTime = event.end.dateTime
              .split("T")[1]
              .split(":")
              .slice(0, 2)
              .join(":");
          } else {
            endTime = startTime;
          }
        }
      } else if (event.start && event.start.date) {
        startDate = event.start.date;
        startTime = null;
        endTime = null;
      }

      if (customerId) {
        if (eventExists) {
          await Event.update(
            {
              event_name: event.summary,
              date: startDate,
              status: event.status,
              calendar_id: calendarId,
              start_time: startTime,
              end_time: endTime,
              user_id: user.user_id,
              customer_id: customerId,
            },
            { where: { google_event_id: event.id } }
          );
        } else {
          await Event.create({
            event_name: event.summary,
            date: startDate,
            google_event_id: event.id,
            status: event.status,
            calendar_id: calendarId,
            start_time: startTime,
            end_time: endTime,
            user_id: user.user_id,
            customer_id: null,
          });
        }
        await updateConsultationDays(customerId);
      } else {
        if (!eventExists) {
          await Event.create({
            event_name: event.summary,
            date: startDate,
            google_event_id: event.id,
            status: event.status,
            calendar_id: calendarId,
            start_time: startTime,
            end_time: endTime,
            user_id: user.user_id,
            customer_id: null,
          });
        }
        unmatchedEvents.push({
          event_name: event.summary,
          date: startDate,
          user_id: user.user_id,
        });
      }
    }

    global.unmatchedEventsCache = unmatchedEvents;

    await deleteNonexistentGoogleEvents(events, calendarId);
  }
};

const deleteNonexistentGoogleEvents = async (events, calendarId) => {
  const googleEventIds = events.map((event) => event.id);
  const allDbEvents = await Event.findAll({
    where: { calendar_id: calendarId },
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

  try {
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

    const authenticationToken = bcrypt.hashSync(new Date().toISOString(), 10);

    const user = await User.findOne({ where: { user_email: data.email } });
    user.autentication_token = authenticationToken;
    await user.save();

    await syncGoogleCalendarWithDatabase(tokens.access_token);

    res.redirect(
      `${process.env.FRONTEND_URL}/token?token=${authenticationToken}`
    );
  } catch (error) {
    res.status(500).send("Erro ao concluir a autenticação.");
  }
}

const checkAndHandleCalendars = async (req, res) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const enabledCalendars = await Calendar.findAll({
      where: { user_id: userId, enabled: true },
    });

    if (!enabledCalendars || enabledCalendars.length === 0) {
      console.log("Nenhum calendário habilitado. Redirecionando para seleção.");
      return res.json({ redirect: "/select-calendar" });
    }

    const calendarIds = enabledCalendars.map(
      (calendar) => calendar.calendar_id
    );
    console.log("Calendários habilitados encontrados:", calendarIds);

    return res.json({
      redirect: `/create-event-form?calendarIds=${calendarIds.join(",")}`,
    });
  } catch (error) {
    console.error("Erro ao verificar calendários:", error);
    res.status(500).json({ error: "Erro interno ao verificar calendários." });
  }
};

module.exports = {
  handleOAuth2Callback,
  initiateGoogleAuth,
  syncGoogleCalendarWithDatabase,
  fetchGoogleCalendarEvents,
  fetchGoogleCalendars,
  checkAndHandleCalendars,
};
