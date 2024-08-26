const { google } = require('googleapis');
const { createEvent: saveEvent, deleteEventById } = require('../services/eventService');
const { oauth2Client } = require('../config/oauth2');
const { Evento } = require('../models/eventModel');

const authenticateClient = async () => {
    if (!oauth2Client.credentials || !oauth2Client.credentials.access_token) {
        try {
            const tokens = await oauth2Client.refreshAccessToken();
            oauth2Client.setCredentials(tokens.credentials);
        } catch (error) {
            console.error('Erro ao autenticar o cliente OAuth2:', error);
            throw new Error('Erro ao autenticar o cliente OAuth2.');
        }
    }
};

const createEventInGoogleCalendar = async (event) => {
    try {
        await authenticateClient();

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: {
                summary: event.event_name,
                description: `Evento criado`,
                start: {
                    dateTime: `${event.date}T${event.start_time}:00`,
                    timeZone: 'America/Sao_Paulo',
                },
                end: {
                    dateTime: `${event.date}T${event.end_time}:00`,
                    timeZone: 'America/Sao_Paulo',
                },
            },
        });

        return response.data.id;
    } catch (error) {
        console.error('Erro ao criar evento no Google Calendar:', error);
        throw new Error('Erro ao criar evento no Google Calendar.');
    }
};

const deleteEventFromGoogleCalendar = async (googleEventId) => {
    try {
        await authenticateClient();

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        await calendar.events.delete({
            calendarId: 'primary',
            eventId: googleEventId,
        });

        console.log("Evento deletado com sucesso do Google Calendar.");
    } catch (error) {
        console.error('Erro ao deletar evento do Google Calendar:', error);
        throw new Error('Erro ao deletar evento do Google Calendar.');
    }
};

exports.createEvent = async (req, res) => {
    try {
        const event = req.body;

        if (!event || !event.event_name || !event.date || !event.start_time || !event.end_time) {
            return res.status(400).send('Dados inválidos.');
        }

        const googleEventId = await createEventInGoogleCalendar(event);

        await saveEvent({
            ...event,
            google_event_id: googleEventId,
        });

        res.send('Evento criado com sucesso.');
    } catch (error) {
        console.error('Erro ao criar evento:', error);
        res.status(500).send(error.message || 'Erro interno do servidor.');
    }
};

exports.deleteEvent = async (req, res) => {
    const { customers_id } = req.params;

    console.log(`Tentando deletar evento com customers_id: ${customers_id}`);

    try {
        const event = await Evento.findOne({ where: { customers_id } });
        if (!event) {
            console.log('Evento não encontrado');
            return res.status(404).send('Evento não encontrado');
        }

        console.log('Evento encontrado:', event);

        if (event.google_event_id) {
            await deleteEventFromGoogleCalendar(event.google_event_id);
        } else {
            console.log('Evento não tem um google_event_id válido, pulando exclusão do Google Calendar.');
        }

        await deleteEventById(customers_id);

        res.send('Evento deletado com sucesso.');
    } catch (error) {
        console.error('Erro ao deletar evento:', error);
        res.status(500).send(error.message || 'Erro interno do servidor.');
    }
};

exports.getEvents = async (req, res) => {
    try {
        const events = await Evento.findAll();
        res.json(events);
    } catch (error) {
        console.error('Erro ao buscar eventos:', error);
        res.status(500).send('Erro interno do servidor.');
    }
};
