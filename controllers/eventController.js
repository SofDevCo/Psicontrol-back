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
  const { enabled, calendar_name } = req.body; // Recebe o nome do calendário e o status
  const userId = req.user.user_id;

  if (!userId) {
    console.error("Erro: user_id está undefined. Verifique o middleware de autenticação.");
    return res.status(400).json({ error: "ID do usuário não encontrado." });
  }

  try {
    console.log(`Calendar ID: ${calendarId}, Enabled: ${enabled}, User ID: ${userId}`); // Log para verificação

    // Verifica se o calendário já existe para o usuário
    const calendar = await Calendar.findOne({
      where: { calendar_id: calendarId, user_id: userId }
    });

    if (calendar) {
      // Se existir, atualiza o estado de `enabled` e `calendar_name`
      await calendar.update({ enabled: !!enabled, calendar_name });
      res.status(200).json({ message: "Status e nome do calendário atualizados com sucesso!" });
    } else {
      // Se não existir, cria um novo registro com `enabled` e `calendar_name`
      await Calendar.create({
        calendar_id: calendarId,
        enabled: !!enabled, // Define `enabled` como verdadeiro ou falso de acordo com o valor recebido
        calendar_name,
        user_id: userId
      });
      res.status(201).json({ message: "Novo calendário criado e status atualizado!" });
    }
  } catch (error) {
    console.error("Erro ao salvar o calendário:", error);
    res.status(500).json({ error: "Erro ao salvar o calendário." });
  }
};





