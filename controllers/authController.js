const { google } = require("googleapis");
const { User, Calendar, Evento } = require("../models");
const { listCalendars } = require("../services/calendarService");
const { oauth2Client, authUrl } = require("../config/oauth2");
const { saveTokens } = require("./tokenController");
const calendar = google.calendar({ version: "v3", auth: oauth2Client });
const bcrypt = require("bcrypt");

const fetchGoogleCalendars = async (accessToken) => {
  oauth2Client.setCredentials({ access_token: accessToken });

  try {
    // console.log('Fetching calendars from Google Calendar...');
    const response = await calendar.calendarList.list();
    return response.data.items;
  } catch (error) {
    console.error("Erro ao buscar calendários:", error);
    throw new Error("Erro ao buscar calendários.");
  }
};

const fetchGoogleCalendarEvents = async (accessToken, calendarId) => {
  oauth2Client.setCredentials({ access_token: accessToken });

  const now = new Date();
  const twoMonthsBefore = new Date();
  const twoMonthsAfter = new Date();

  twoMonthsBefore.setMonth(now.getMonth() - 2);
  twoMonthsAfter.setMonth(now.getMonth() + 2);

  // console.log('Fetching events from Google Calendar...');
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

      if (!calendarId) {
        throw new Error("calendarId is not defined");
      }

      const dbCalendar = await Calendar.findOne({
        where: { calendar_id: calendarId },
      });

      const user = await User.findOne({ where: { access_token: accessToken } });
      console.log(user);

      if (!dbCalendar) {
        await Calendar.create({
          calendar_id: calendarId,
          calendar_name: calendar.summary,
          user_id: user.user_id,
        });
      }

      const events = await fetchGoogleCalendarEvents(accessToken, calendarId);

      for (const event of events) {
        const eventExists = await Evento.findOne({
          where: { google_event_id: event.id },
        });

        let startDate = null,
          startTime = null,
          endTime = null;

        if (event.start && event.start.dateTime) {
          startDate = event.start.dateTime.split("T")[0];
          startTime = event.start.dateTime
            .split("T")[1]
            .split(":")
            .slice(0, 2)
            .join(":");
          endTime = event.end.dateTime
            .split("T")[1]
            .split(":")
            .slice(0, 2)
            .join(":");
        } else if (event.start && event.start.date) {
          startDate = event.start.date;
          startTime = "00:00";
          endTime = "23:59";
        }

        if (eventExists) {
          await Evento.update(
            {
              event_name: event.summary,
              date: startDate,
              status: event.status,
              calendar_id: calendarId,
              start_time: startTime,
              end_time: endTime,
              user_id: user.user_id,
            },
            { where: { google_event_id: event.id } }
          );
        } else {
          await Evento.create({
            event_name: event.summary,
            date: startDate,
            google_event_id: event.id,
            status: event.status,
            calendar_id: calendarId,
            start_time: startTime,
            end_time: endTime,
            user_id: user.user_id,
          });
        }
      }
      await deleteNonexistentGoogleEvents(events, calendarId);
    }
  } catch (error) {
    console.error("Erro ao sincronizar eventos com o banco de dados:", error);
  }
};

const deleteNonexistentGoogleEvents = async (events, calendarId) => {
  try {
    const googleEventIds = events.map((event) => event.id);
    const allDbEvents = await Evento.findAll({
      where: { calendar_id: calendarId },
    });

    for (const dbEvent of allDbEvents) {
      if (!googleEventIds.includes(dbEvent.google_event_id)) {
        await dbEvent.update({ status: "cancelado" });
        // console.log(`Evento com ID ${dbEvent.google_event_id} marcado como cancelado no banco de dados.`);
      }
    }
  } catch (error) {
    console.error(
      "Erro ao atualizar eventos inexistentes no Google Calendar:",
      error
    );
    throw new Error(
      "Erro ao atualizar eventos inexistentes no Google Calendar."
    );
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
    if (calendars.length === 0) {
      throw new Error("Nenhum calendário encontrado.");
    }

    let oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2",
    });

    const { data } = await oauth2.userinfo.get();
    console.log("Email extraído:", data.email);

    if (!data.email) {
      return res.status(400).json({
        statusCode: 400,
        message: "Email não encontrado.",
      });
    }

    let user = await User.findOne({ where: { user_email: data.email } });
    if (!user) {
      user = await User.create({
        user_email: data.email,
        user_name: data.name,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
    } else {
      await saveTokens(
        data.name,
        data.email,
        tokens.accessToken,
        tokens.refresh_token
      );
    }

    const authenticationToken = bcrypt.hashSync(new Date().toISOString(), 10);

    user.autentication_token = authenticationToken;
    await user.save();

    await syncGoogleCalendarWithDatabase(tokens.access_token);

    res.redirect(`http://localhost:3001/token/${authenticationToken}`);
  } catch (error) {
    console.error("Erro ao obter o token de autenticação:", error);
    res.status(500).send("Erro ao concluir a autenticação.");
  }
}
  
module.exports = {
  handleOAuth2Callback,
  initiateGoogleAuth,
  syncGoogleCalendarWithDatabase,
  fetchGoogleCalendarEvents,
  fetchGoogleCalendars,
};
