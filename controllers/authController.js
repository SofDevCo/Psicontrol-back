const { google } = require('googleapis');
const { createEvent: saveEvent, eventExists, deleteEventByGoogleId, updateEvent } = require('../services/eventService');
const { oauth2Client, authUrl } = require('../config/oauth2');
const { Evento } = require('../models/eventModel');
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
const syncGoogleCalendarWithDatabase = async (accessToken) => {
    oauth2Client.setCredentials({ access_token: accessToken });
    try {
        const now = new Date();
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(now.getMonth() - 2);
        console.log('Fetching events from Google Calendar...');
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: twoMonthsAgo.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });
        const events = response.data.items;
        console.log('Eventos recebidos do Google Calendar:', events);

        for (const event of events) {
            const eventStatus = event.status || 'confirmed'; 

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
            console.log('Processando evento:', {
                event_id: event.id,
                event_name: event.summary,
                date: startDate,
                start_time: startTime,
                end_time: endTime,
                status: eventStatus
            });
            const existingEvent = await eventExists(event.id);
            console.log('Evento existente no banco de dados:', existingEvent);
            if (!existingEvent) {
                console.log('Criando novo evento no banco de dados...');
                await saveEvent({
                    event_name: event.summary || 'Sem título',
                    date: startDate, 
                    start_time: startTime,
                    end_time: endTime,
                    google_event_id: event.id,
                    status: eventStatus
                });
            } else {
                const existingDate = existingEvent.date;
                console.log('Data existente no banco de dados:', existingDate);
                console.log('Data do evento Google Calendar:', startDate);
                if (startDate !== existingDate || eventStatus !== existingEvent.status) {
                    console.log('Atualizando evento existente no banco de dados...');
                    await updateEvent({
                        event_name: event.summary || 'Sem título',
                        date: startDate,
                        start_time: startTime,
                        end_time: endTime,
                        google_event_id: event.id,
                        status: eventStatus
                    });
                }
            }
        }
        console.log('Removendo eventos inexistentes...');
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
        console.log('token:', tokens);
        await syncGoogleCalendarWithDatabase(tokens.access_token);
        res.redirect('/events/create-event-form');
    } catch (error) {
        console.error('Erro ao obter o token de autenticação:', error);
        res.status(500).send('Erro ao concluir a autenticação.');
    }
}
module.exports = { handleOAuth2Callback, initiateGoogleAuth };