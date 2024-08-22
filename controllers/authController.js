const { google } = require('googleapis');
const { createEvent: saveEvent } = require('../services/eventService');
const { oauth2Client } = require('../config/oauth2');

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
            const existingEvent = await saveEvent({
                event_name: event.summary,
                date: event.start.dateTime.split('T')[0],
                start_time: event.start.dateTime.split('T')[1].split(':')[0] + ':' + event.start.dateTime.split('T')[1].split(':')[1],
                end_time: event.end.dateTime.split('T')[1].split(':')[0] + ':' + event.end.dateTime.split('T')[1].split(':')[1],
                google_event_id: event.id,
            });

            console.log('Evento salvo no banco de dados:', existingEvent);
        }
    } catch (error) {
        console.error('Erro ao sincronizar eventos com o banco de dados:', error);
        throw new Error('Erro ao sincronizar eventos.')
    }
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
        res.send(`
            <p>Autenticação e sincronização concluídas! Agora você pode criar eventos.</p>
            <a href="/events/create-event-form">Clique aqui para criar um evento</a>
        `);
    } catch (error) {
        console.error('Erro ao obter o token de autenticação:', error);
        res.status(500).send('Erro ao concluir a autenticação.');
    }
}

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
});

module.exports = { handleOAuth2Callback, authUrl };
