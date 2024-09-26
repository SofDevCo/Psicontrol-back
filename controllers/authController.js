const { google } = require('googleapis');
const { Evento } = require('../models/eventModel');
const { Calendar } = require('../models/calendarModel');
const { listCalendars } = require('../services/calendarService');
const { oauth2Client, authUrl } = require('../config/oauth2');
const { saveTokens } = require('./tokenController');
const { get } = require('../routes/eventRoutes');
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
const {findCreateUser} = require('../services/getTokenService');

const fetchGoogleCalendars = async (accessToken) => {
    oauth2Client.setCredentials({ access_token: accessToken });

    try {
        // console.log('Fetching calendars from Google Calendar...');
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
    const twoMonthsBefore = new Date();
    const twoMonthsAfter = new Date();

    twoMonthsBefore.setMonth(now.getMonth() - 2);
    twoMonthsAfter.setMonth(now.getMonth() + 2);

    // console.log('Fetching events from Google Calendar...');
    const response = await calendar.events.list({
        calendarId: calendarId,
        timeMin: twoMonthsBefore.toISOString(),
        timeMax: twoMonthsAfter.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
    });

    return response.data.items.map(event => ({
        ...event,
        start: {
            ...event.start,
            dateTime: event.start.dateTime ? new Date(event.start.dateTime).toISOString() : null
        }
    }));
};


const syncGoogleCalendarWithDatabase = async (accessToken) => {
    try {
        oauth2Client.setCredentials({ access_token: accessToken });
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

                let  startDate = null, startTime = null, endTime = null;
                
                if (event.start && event.start.dateTime) {
                    startDate = event.start.dateTime.split('T')[0];
                    startTime = event.start.dateTime.split('T')[1].split(':').slice(0, 2).join(':');
                    endTime = event.end.dateTime.split('T')[1].split(':').slice(0, 2).join(':');
                } else if (event.start && event.start.date) {
                    startDate = event.start.date;
                    startTime = "00:00";
                    endTime = "23:59";
                }

                if (eventExists) {
                    await Evento.update({
                        event_name: event.summary,
                        date: startDate,
                        status: event.status,
                        calendar_id: calendarId,
                        start_time: startTime,
                        end_time: endTime
                    }, { where: { google_event_id: event.id } });
                } else {
                    await Evento.create({
                        event_name: event.summary,
                        date: startDate,
                        google_event_id: event.id,
                        status: event.status,
                        calendar_id: calendarId,
                        start_time: startTime,
                        end_time: endTime
                    });
                }
            }
            await deleteNonexistentGoogleEvents(events, calendarId);
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

const getUserId = (req, res) => {
    if (req.session && req.session.userId) {
        res.json({ userId: req.session.userId });
    } else {
        res.status(401).json({ error: 'User ID não encontrado na sessão.' });
    }
};


async function handleOAuth2Callback(req, res) {
    const { code } = req.query;
    if (!code) {
        return res.status(400).send('Código de autorização ausente.');
    }
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials({ access_token: tokens.access_token });

        const calendars = await listCalendars();
        if (calendars.length === 0) {
            throw new Error('Nenhum calendário encontrado.');
        }
        const calendarId = calendars[0].id;

        let oauth2 = google.oauth2({
            auth: oauth2Client,
            version: 'v2'
        });

        const { data } = await oauth2.userinfo.get();

        await saveTokens(data.name, data.email, tokens.access_token, tokens.refresh_token);

        const userData = {
            user_name: data.name,
            user_email: data.email,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
        };

        const user = await findCreateUser(data.id, userData);

        req.session.userId = data.id;

        await syncGoogleCalendarWithDatabase(tokens.access_token);

        res.redirect('/events/select-calendar');
    } catch (error) {
        console.error('Erro ao obter o token de autenticação:', error);
        res.status(500).send('Erro ao concluir a autenticação.');
    }
}



module.exports = { handleOAuth2Callback, initiateGoogleAuth, syncGoogleCalendarWithDatabase, fetchGoogleCalendarEvents, fetchGoogleCalendars, getUserId };
