const { google } = require("googleapis");
const {
  createEvent: saveEvent,
  cancelEventByGoogleId,
} = require("../services/eventService");
const { syncGoogleCalendarWithDatabase } = require("./authController");
const { oauth2Client } = require("../config/oauth2");
const { Evento } = require("../models/eventModel");
const { where } = require("sequelize");

const authenticateClient = async () => {
  if (!oauth2Client.credentials || !oauth2Client.credentials.access_token) {
    try {
      const tokens = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(tokens.credentials);
    } catch (error) {
      console.error("Erro ao autenticar o cliente OAuth2:", error);
      throw new Error("Erro ao autenticar o cliente OAuth2.");
    }
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
  } catch (error) {
    console.error("Erro ao criar evento no Google Calendar:", error);
    throw new Error("Erro ao criar evento no Google Calendar.");
  }
};

const deleteEventFromGoogleCalendar = async (calendarId, googleEventId) => {
  try {
    await authenticateClient();

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    if (!googleEventId) {
      throw new Error("O ID do evento não pode estar vazio.");
    }

    //console.log('Tentando deletar evento com ID:', googleEventId);
    await calendar.events.delete({
      calendarId: calendarId,
      eventId: googleEventId,
    });

    console.log("Evento deletado com sucesso do Google Calendar.");
  } catch (error) {
    console.error("Erro ao deletar evento do Google Calendar:", {
      message: error.message,
      stack: error.stack,
      response: error.response ? error.response.data : "Sem resposta",
      config: error.config,
    });
    throw new Error("Erro ao deletar evento do Google Calendar.");
  }
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
    console.error("Erro ao criar evento:", error);
    if (error.message) {
      res.status(500).send(error.message);
    } else {
      res.status(500).send("Erro interno do servidor.");
    }
  }
};

exports.deleteEvent = async (req, res) => {
  // console.log("Delete request params:", req.params);
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
    console.error("Erro ao cancelar evento:", error);
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
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log("Evento não encontrado no Google Calendar.");
    } else {
      console.error("Erro ao verificar evento:", error);
    }
    return null;
  }
};

exports.getEvents = async (req, res) => {
  try {
    const events = await Evento.find({where: {user_id: req.user.user_id}});
    res.json(events);
  } catch (error) {
    console.error("Erro ao buscar eventos:", error);
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
    console.error("Erro ao sincronizar o calendário:", error);
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
    console.error("Erro ao listar os calendários:", error);
    res.status(500).send("Erro ao listar os calendários.");
  }
};

exports.getEventsByCalendar = async (req, res) => {
  try {
    const { calendarId } = req.params;
    console.log("calendarId", calendarId);

    const events = await Evento.findAll({
      where: { calendar_id: calendarId },
    });
    res.json(events);
  } catch (error) {
    console.error("Erro ao buscar eventos por calendário:", error);
    res.status(500).json({ error: "Erro ao buscar eventos." });
  }
};
