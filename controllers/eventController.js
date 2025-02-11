const { google } = require("googleapis");
const { Op } = require("sequelize");

const {
  createEvent: saveEvent,
  cancelEventByGoogleId,
} = require("../services/eventService");
const { syncGoogleCalendarWithDatabase } = require("./authController");
const { oauth2Client } = require("../config/oauth2");
const { Event, Calendar } = require("../models");

const authenticateClient = async () => {
  if (!oauth2Client.credentials || !oauth2Client.credentials.access_token) {
    const tokens = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(tokens.credentials);
  }
};

const createEventInGoogleCalendar = async (event, calendarId) => {
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const response = await calendar.events.insert({
    calendarId: calendarId,
    resource: {
      summary: event.event_name,
      description: "Evento criado",
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
};

const deleteEventFromGoogleCalendar = async (calendarId, googleEventId) => {
  await authenticateClient();
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  await calendar.events.delete({
    calendarId: calendarId,
    eventId: googleEventId,
  });
};

exports.createEvent = async (req, res) => {
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
};

exports.deleteEvent = async (req, res) => {
  const { google_event_id, calendarId } = req.params;

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
};

exports.deleteUnmatchedEvent = async (req, res) => {
  const { google_event_id } = req.params;

  const event = await Event.findOne({
    where: {
      user_id: req.user.user_id,
      customer_id: null,
      google_event_id: google_event_id,
    },
  });

  if (!event) {
    return res.status(404).send("Evento não encontrado ou já sincronizado.");
  }

  await event.destroy();

  if (event.google_event_id) {
    await deleteEventFromGoogleCalendar(
      event.calendar_id,
      event.google_event_id
    );
  }

  res.send("Evento excluído com sucesso.");
};

const checkEventExists = async (googleEventId, calendarId) => {
  await authenticateClient();
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const event = await calendar.events.get({
    calendarId: calendarId,
    eventId: googleEventId,
  });
  return event.data;
};

exports.syncCalendar = async (req, res) => {
  const { calendarId } = req.params;
  const tokens = oauth2Client.credentials;
  if (!tokens || !tokens.access_token) {
    return res
      .status(401)
      .send("Token de autenticação não encontrado. Faça login novamente.");
  }

  await syncGoogleCalendarWithDatabase(tokens.access_token, calendarId);

  res.json({ message: "Calendário sincronizado com sucesso." });
};

exports.listCalendars = async (req, res) => {
  oauth2Client.setCredentials({
    access_token: req.user.access_token,
    refresh_token: req.user.refresh_token,
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const response = await calendar.calendarList.list();

  const googleCalendars = response.data.items;

  const userId = req.user.user_id;
  const dbCalendars = await Calendar.findAll({
    where: { user_id: userId },
    attributes: ["calendar_id", "enabled"],
  });

  const dbCalendarsMap = dbCalendars.reduce((acc, cal) => {
    acc[cal.calendar_id] = cal.enabled;
    return acc;
  }, {});

  const mergedCalendars = googleCalendars.map((cal) => ({
    calendar_id: cal.id,
    calendar_name: cal.summary,
    enabled: dbCalendarsMap[cal.id] || false,
  }));

  res.status(200).json(mergedCalendars);
};

exports.getEventsByCalendar = async (req, res) => {
  const { calendarId } = req.params;

  const events = await Event.findAll({
    where: {
      calendar_id: calendarId,
      user_id: req.user.user_id,
      status: { [Op.notIn]: ["cancelado"] },
    },
  });

  res.json(events);
};

exports.saveSelectedCalendars = async (req, res) => {
  const { calendarId } = req.params;
  const { enabled, calendar_name } = req.body;
  const userId = req.user.user_id;

  if (!userId) {
    return res.status(400).json({ error: "ID do usuário não encontrado." });
  }

  if (!calendarId || calendarId === "undefined") {
    return res.status(400).json({ error: "ID do calendário inválido." });
  }

  const calendar = await Calendar.findOne({
    where: { calendar_id: calendarId, user_id: userId },
  });

  if (calendar) {
    await calendar.update({ enabled: !!enabled, calendar_name });
    return res
      .status(200)
      .json({ message: "Calendário atualizado com sucesso!" });
  } else {
    await Calendar.create({
      calendar_id: calendarId,
      enabled: !!enabled,
      calendar_name,
      user_id: userId,
    });
    res.status(201).json({ message: "Calendário criado com sucesso!" });
  }
};
