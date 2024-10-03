const { google } = require("googleapis");
const {
  createEvent: saveEvent,
  cancelEventByGoogleId,
} = require("../services/eventService");
const { syncGoogleCalendarWithDatabase } = require("./authController");
const { oauth2Client } = require("../config/oauth2");
const { Event, Calendar } = require("../models");

const authenticateClient = async () => {
  if (!oauth2Client.credentials || !oauth2Client.credentials.access_token) {
    try {
      const tokens = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(tokens.credentials);
    } catch (error) {}
  }
};

const createEventInGoogleCalendar = async (event, calendarId) => {
  try {
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: {
        summary: event.event_name,
        description: `Evento criado`,
        start: {
          dateTime: `${event.date}T${event.start_time}:00`,
          timeZone: "America/Sao_Paulo",
        },
        end: {
          dateTime: `${event.date}T${event.end_time}:00`,
          timeZone: "America/Sao_Paulo",
        },
      },
    });
    return response.data.id;
  } catch (error) {}
};

const deleteEventFromGoogleCalendar = async (calendarId, googleEventId) => {
  try {
    await authenticateClient();

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    await calendar.events.delete({
      calendarId: calendarId,
      eventId: googleEventId,
    });
  } catch (error) {}
};

exports.createEvent = async (req, res) => {
  try {
    const event = req.body;
    if (
      !event ||
      !event.event_name ||
      !event.date ||
      !event.start_time ||
      !event.end_time ||
      !event.calendarId
    ) {
      return res.status(400).send("Dados inválidos.");
    }

    const googleEventId = await createEventInGoogleCalendar(
      event,
      event.calendarId
    );

    await saveEvent({
      ...event,
      google_event_id: googleEventId,
    });

    res.send("Evento criado com sucesso.");
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.deleteEvent = async (req, res) => {
  const { google_event_id, calendarId } = req.params;

  try {
    if (!google_event_id || !calendarId) {
      return res
        .status(400)
        .send("Os parâmetros google_event_id e calendarId são necessários.");
    }

    const existingEvent = await checkEventExists(google_event_id, calendarId);
    if (!existingEvent) {
      return res.status(404).send("Evento não encontrado no Google Calendar.");
    }

    await deleteEventFromGoogleCalendar(calendarId, google_event_id);

    await cancelEventByGoogleId(google_event_id);

    res.send("Evento cancelado com sucesso.");
  } catch (error) {
    res.status(500).send(`Erro interno do servidor: ${error.message}`);
  }
};

const checkEventExists = async (googleEventId, calendarId) => {
  try {
    await authenticateClient();
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const event = await calendar.events.get({
      calendarId: calendarId,
      eventId: googleEventId,
    });

    return event.data;
  } catch (error) {}
};

exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find({ where: { user_id: req.user.user_id } });
    res.json(events);
  } catch (error) {
    res.status(500).send("Erro interno do servidor.");
  }
};

exports.syncCalendar = async (req, res) => {
  const { calendarId } = req.params;

  try {
    const tokens = oauth2Client.credentials;
    if (!tokens || !tokens.access_token) {
      return res
        .status(401)
        .send("Token de autenticação não encontrado. Faça login novamente.");
    }

    await syncGoogleCalendarWithDatabase(tokens.access_token, calendarId);

    res.json({ message: "Calendário sincronizado com sucesso." });
  } catch (error) {
    res.status(500).send("Erro ao sincronizar o calendário.");
  }
};

exports.listCalendars = async (req, res) => {
  try {
    oauth2Client.setCredentials({
      access_token: req.user.access_token,
      refresh_token: req.user.refresh_token,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const response = await calendar.calendarList.list();

    res.json(response.data.items);
  } catch (error) {
    res.status(500).send("Erro ao listar os calendários.");
  }
};

exports.getEventsByCalendar = async (req, res) => {
  try {
    const { calendarId } = req.params;

    const events = await Event.findAll({
      where: { calendar_id: calendarId, user_id: req.user.user_id },
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar eventos." });
  }
};

exports.saveSelectedCalendars = async (req, res) => {
  const { calendarId } = req.params;
  const { enabled } = req.body;

  try {
    const calendar = await Calendar.findOne({
      where: { calendar_id: calendarId },
    });

    if (calendar) {
      await Calendar.update(
        { enabled },
        { where: { calendar_id: calendarId } }
      );
      res
        .status(200)
        .json({ message: "Status do calendário atualizado com sucesso!" });
    } else {
      res.status(404).json({ error: "Calendário não encontrado." });
    }
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar o calendário." });
  }
};
