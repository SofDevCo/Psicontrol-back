const { google } = require('googleapis');
const { createEvent: saveEvent } = require('../services/eventService');
const { oauth2Client } = require('../config/oauth2');

const createEventInGoogleCalendar = async (event) => {
    try {
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
        if (error.message) {
            res.status(500).send(error.message);
        } else {
            res.status(500).send('Erro interno do servidor.');
        }
    }
};
