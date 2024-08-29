const { google } = require('googleapis');
const { createEvent: saveEvent, deleteEventByGoogleId } = require('../services/eventService');
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
            return res.status(400).json({ message: 'Dados inválidos.' });
        }

        const googleEventId = await createEventInGoogleCalendar(event);

        await saveEvent({
            ...event,
            google_event_id: googleEventId,
        });

        // Envie uma resposta JSON em vez de uma simples mensagem
        res.status(201).json({ message: 'Evento criado com sucesso.', eventId: googleEventId });
    } catch (error) {
        console.error('Erro ao criar evento:', error);
        res.status(500).json({ message: error.message || 'Erro interno do servidor.' });
    }
}; 


exports.deleteEvent = async (req, res) => {
    const { google_event_id } = req.params;

    console.log(`Tentando deletar evento com google_event_id: ${google_event_id}`);

    try {
        if (!google_event_id) {
            return res.status(400).send('O parâmetro google_event_id é necessário.');
        }
        const event = await Evento.findOne({ where: { google_event_id } });
        if (!event) {
            console.log('Evento não encontrado');
            return res.status(404).send('Evento não encontrado');
        }

        console.log('Evento encontrado:', event);

        if (event.google_event_id) {
            console.log('Deletando evento do Google Calendar...');
            await deleteEventFromGoogleCalendar(event.google_event_id);
        } else {
            console.log('Evento não tem um google_event_id válido, pulando exclusão do Google Calendar.');
        }

        console.log('Deletando evento do banco de dados...');
        await deleteEventByGoogleId(google_event_id);

        res.send('Evento deletado com sucesso.');
    } catch (error) {
        console.error('Erro ao deletar evento:', error);
        res.status(500).send(`Erro interno do servidor: ${error.message}`);
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

const syncGoogleCalendarWithDatabase = async () => {
    try {
        await authenticateClient();

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // Obtém eventos a partir de uma data (exemplo: 2 meses atrás)
        const now = new Date();
        const twoMonthsAgo = new Date(now.setMonth(now.getMonth() - 2)).toISOString();

        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: twoMonthsAgo,
            singleEvents: true,
            orderBy: 'startTime',
        });

        const googleEvents = response.data.items;

        for (const googleEvent of googleEvents) {
            const existingEvent = await Evento.findOne({ where: { google_event_id: googleEvent.id } });

            if (existingEvent) {
                // Verificar se o evento foi alterado no Google Calendar
                if (existingEvent.event_name !== googleEvent.summary || existingEvent.date !== googleEvent.start.dateTime) {
                    // Atualiza o evento no banco de dados
                    await Evento.update({
                        event_name: googleEvent.summary,
                        date: googleEvent.start.dateTime,
                    }, {
                        where: { google_event_id: googleEvent.id }
                    });
                }
            } else {
                // Se o evento não existe no banco de dados, cria um novo
                await saveEvent({
                    event_name: googleEvent.summary,
                    date: googleEvent.start.dateTime,
                    google_event_id: googleEvent.id,
                });
            }
        }

        console.log('Sincronização completa com o Google Calendar.');
    } catch (error) {
        console.error('Erro ao sincronizar com o Google Calendar:', error);
        throw new Error('Erro ao sincronizar com o Google Calendar.');
    }
};

exports.syncCalendar = async (req, res) => {
    try {
        await syncGoogleCalendarWithDatabase();
        res.status(200).json({ message: 'Sincronização concluída com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
