const { google } = require('googleapis');
const { createEvent: saveEvent, eventExists, deleteEventByGoogleId } = require('../services/eventService');
const { oauth2Client, authUrl } = require('../config/oauth2');
const { Evento } = require('../models/eventModel');

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

const syncGoogleCalendarWithDatabase = async (accessToken) => {
    oauth2Client.setCredentials({ access_token: accessToken });

    try {
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: (new Date()).toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = response.data.items;

        for (const event of events) {
            const existingEvent = await eventExists(event.id);

            if (!existingEvent) {
                let startDate = null, startTime = null, endTime = null;

                if (event.start && event.start.dateTime) {
                    startDate = event.start.dateTime.split('T')[0];
                    startTime = event.start.dateTime.split('T')[1].split(':').slice(0, 2).join(':');
                    endTime = event.end.dateTime.split('T')[1].split(':').slice(0, 2).join(':');
                } else if (event.start && event.start.date) {
                    startDate = event.start.date;
                    startTime = "00:00";
                    endTime = "23:59";
                }

                await saveEvent({
                    event_name: event.summary || 'Sem título',
                    date: startDate,
                    start_time: startTime,
                    end_time: endTime,
                    google_event_id: event.id,
                });
            }
        }

        await deleteNonexistentGoogleEvents(events);

    } catch (error) {
        console.error('Erro ao sincronizar eventos com o banco de dados:', error);
        throw new Error('Erro ao sincronizar eventos.');
    }
};

const deleteNonexistentGoogleEvents = async (events) => {
    try {
        const googleEventIds = events.map(event => event.id);
        const allDbEvents = await Evento.findAll();

        for (const dbEvent of allDbEvents) {
            if (!googleEventIds.includes(dbEvent.google_event_id)) {
                await deleteEventByGoogleId(dbEvent.google_event_id);
            }
        }
    } catch (error) {
        console.error('Erro ao deletar eventos inexistentes no Google Calendar:', error);
        throw new Error('Erro ao deletar eventos inexistentes no Google Calendar.');
    }
};

const initiateGoogleAuth = (req, res) => {
    res.json({ authUrl });
};

async function handleOAuth2Callback(req, res) {
    const { code } = req.query;
    if (!code) {
        return res.status(400).send('Código de autorização ausente.');
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        await syncGoogleCalendarWithDatabase(tokens.access_token);
        res.redirect('/events/create-event-form');
    } catch (error) {
        console.error('Erro ao obter o token de autenticação:', error);
        res.status(500).send('Erro ao concluir a autenticação.');
    }
}

module.exports = { handleOAuth2Callback, initiateGoogleAuth };
