const { google } = require('googleapis');
const { createEvent: saveEvent, eventExists, cancelEventByGoogleId, updateEvent } = require('../services/eventService');
const { oauth2Client, authUrl } = require('../config/oauth2');
const { Evento } = require('../models/eventModel');
const { Calendar } = require('../models/calendarModel');
const { listCalendars } = require('../services/calendarService');

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

const fetchGoogleCalendars = async (accessToken) => {
    oauth2Client.setCredentials({ access_token: accessToken });

    try {
        console.log('Fetching calendars from Google Calendar...');
        const response = await calendar.calendarList.list();
        return response.data.items;
    } catch (error) {
        console.error('Erro ao buscar calendários:', error);
        throw new Error('Erro ao buscar calendários.');
    }
};

const fetchGoogleCalendarEvents = async (accessToken, calendarId) => {
    oauth2Client.setCredentials({ access_token: accessToken });

    const now = new Date();
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(now.getMonth() - 2);

    console.log('Fetching events from Google Calendar...');
    const response = await calendar.events.list({
        calendarId: calendarId, 
        timeMin: twoMonthsAgo.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
    });

    return response.data.items;
};

const syncGoogleCalendarWithDatabase = async (accessToken) => {
    try {
        const calendars = await fetchGoogleCalendars(accessToken);

        for (const calendar of calendars) {
            const calendarId = calendar.id;

            if (!calendarId) {
                throw new Error('calendarId is not defined');
            }

            const dbCalendar = await Calendar.findOne({ where: { calendar_id: calendarId } });

            if (!dbCalendar) {
                await Calendar.create({ calendar_id: calendarId, calendar_name: calendar.summary });
            }

            const events = await fetchGoogleCalendarEvents(accessToken, calendarId);

            for (const event of events) {
                const eventExists = await Evento.findOne({ where: { google_event_id: event.id } });

                if (eventExists) {
                    await Evento.update({
                        event_name: event.summary,
                        date: event.start.dateTime,
                        status: event.status,
                        calendar_id: calendarId
                    }, { where: { google_event_id: event.id } });
                } else {
                    await Evento.create({
                        event_name: event.summary,
                        date: event.start.dateTime,
                        google_event_id: event.id,
                        status: event.status,
                        calendar_id: calendarId
                    });
                }
            }
        }
    } catch (error) {
        console.error('Erro ao sincronizar eventos com o banco de dados:', error);
        throw new Error('Erro ao sincronizar eventos com o banco de dados.');
    }
};

const deleteNonexistentGoogleEvents = async (events, calendarId) => {
    try {
        const googleEventIds = events.map(event => event.id);
        const allDbEvents = await Evento.findAll({ where: { calendar_id: calendarId } }); 

        for (const dbEvent of allDbEvents) {
            if (!googleEventIds.includes(dbEvent.google_event_id)) {
                await dbEvent.update({ status: 'cancelado' });
                console.log(`Evento com ID ${dbEvent.google_event_id} marcado como cancelado no banco de dados.`);
            }
        }
    } catch (error) {
        console.error('Erro ao atualizar eventos inexistentes no Google Calendar:', error);
        throw new Error('Erro ao atualizar eventos inexistentes no Google Calendar.');
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

        const calendars = await listCalendars();
        if (calendars.length === 0) {
            throw new Error('Nada encontrado');
        }
        const calendarId = calendars[0].id;

        await syncGoogleCalendarWithDatabase(tokens.access_token);

        res.redirect('/events/create-event-form');
    } catch (error) {
        console.error('Erro ao obter o token de autenticação:', error);
        res.status(500).send('Erro ao concluir a autenticação.');
    }
}

module.exports = { handleOAuth2Callback, initiateGoogleAuth, syncGoogleCalendarWithDatabase, fetchGoogleCalendarEvents };
