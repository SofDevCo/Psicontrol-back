const { google } = require("googleapis");
const { User, Calendar, Event, Customer } = require("../models");
const Fuse = require("fuse.js");
const { listCalendars } = require("../services/calendarService");
const { format, utcToZonedTime, zonedTimeToUtc } = require("date-fns-tz");
const { parseISO, getDate } = require("date-fns");
const { oauth2Client, authUrl } = require("../config/oauth2");
const { saveTokens } = require("./tokenController");
const { updateConsultationDays } = require("../utils/updateConsultationDays");
const calendar = google.calendar({ version: "v3", auth: oauth2Client });
const bcrypt = require("bcrypt");

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
  try {
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
        });
      }

      const events = await fetchGoogleCalendarEvents(accessToken, calendarId);
      const patients = await Customer.findAll();

      const fuse = new Fuse(patients, {
        keys: ["customer_name"],
        threshold: 0.3,
      });

      const unmatchedEvents = [];

      for (const event of events) {
        const eventExists = await Event.findOne({
          where: { google_event_id: event.id },
        });

        let startDate = null,
          startTime = null,
          endTime = null;

        if (event.start && event.start.dateTime) {
          const utcStart = zonedTimeToUtc(
            event.start.dateTime,
            CLIENT_TIMEZONE
          );
          const utcEnd = zonedTimeToUtc(event.end.dateTime, CLIENT_TIMEZONE);

          startDate = format(utcStart, "yyyy-MM-dd");
          startTime = format(utcStart, "HH:mm");
          endTime = format(utcEnd, "HH:mm");
        } else if (event.start && event.start.date) {
          startDate = event.start.date;
          startTime = "00:00";
          endTime = "23:59";
        }

        const result = fuse.search(event.summary.trim());
        const bestMatch = result.length > 0 ? result[0].item : null;
        const customerId = bestMatch ? bestMatch.customer_id : null;

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
              customer_id: customerId,
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
  } catch (error) {
    console.error(error);
  }
};

const deleteNonexistentGoogleEvents = async (events, calendarId) => {
  try {
    const googleEventIds = events.map((event) => event.id);
    const allDbEvents = await Event.findAll({
      where: { calendar_id: calendarId },
    });

    for (const dbEvent of allDbEvents) {
      if (!googleEventIds.includes(dbEvent.google_event_id)) {
        await dbEvent.update({ status: "cancelado" });
      }
    }
  } catch (error) {}
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
    const user = await User.findOne({ where: { user_email: data.email } });
    user.autentication_token = authenticationToken;
    await user.save();

    await syncGoogleCalendarWithDatabase(tokens.access_token);

    res.redirect(`http://localhost:3001/token?token=${authenticationToken}`);
  } catch (error) {
    res.status(500).send("Erro ao concluir a autenticação.");
  }
}

const checkAndHandleCalendars = async (req, res) => {
  try {
    // Recupera o token de autenticação do cabeçalho
    const authenticationToken = req.headers.authorization?.split(" ")[1];

    if (!authenticationToken) {
      return res.status(401).json({ message: "Token de autenticação ausente." });
    }

    // Busca o usuário com base no token de autenticação
    const user = await User.findOne({ where: { autentication_token: authenticationToken } });

    if (!user) {
      return res.status(401).json({ message: "Usuário não encontrado." });
    }


    // Busca os calendários do usuário no banco de dados
    const userCalendars = await Calendar.findAll({ where: { user_id: user.user_id } });

    if (userCalendars.length > 0) {
      // Redireciona para criar eventos se houver calendários
      const ids = userCalendars.map((calendar) => calendar.calendar_id);
      return res.json({
        redirect: `/create-event-form?calendarIds=${ids.join(",")}`,
      });
    }

    // Redireciona para seleção de calendários se não houver
    return res.json({
      redirect: `/select-calendar`,
    });
  } catch (error) {
    console.error("Erro ao verificar calendários:", error);
    res.status(500).json({ message: "Erro ao verificar calendários." });
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
