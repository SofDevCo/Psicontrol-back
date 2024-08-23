const { google } = require('googleapis');
const { createEvent: saveEvent, deleteEventById } = require('../services/eventService');
const { oauth2Client } = require('../config/oauth2');
const { Evento } = require('../models/eventModel');

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

const deleteEventFromGoogleCalendar = async (googleEventId) => {
    try {
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        await calendar.events.delete({
            calendarId: 'primary',
            eventId: googleEventId,
        });

        console.log("Evento deletado com sucesso");
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
        if (error.message) {
            res.status(500).send(error.message);
        } else {
            res.status(500).send('Erro interno do servidor.');
        }
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

        await deleteEventFromGoogleCalendar(event.google_event_id);
        await deleteEventById(customers_id);

        res.send('Evento deletado com sucesso.');
    } catch (error) {
        console.error('Erro ao deletar evento:', error);
        if (error.message) {
            res.status(500).send(error.message);
        } else {
            res.status(500).send('Erro interno do servidor.');
        }
    }
};



// Adicione a função getEvents para buscar todos os eventos
exports.getEvents = async (req, res) => {
    try {
        const events = await Evento.findAll();
        res.json(events);
    } catch (error) {
        console.error('Erro ao buscar eventos:', error);
        res.status(500).send('Erro interno do servidor.');
    }
};
