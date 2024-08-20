const { google } = require('googleapis');
const oauth2Client = require('../config/oauth2');

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

exports.createEvent = async (event) => {
    return calendar.events.insert({
        calendarId: 'primary',
        resource: {
            summary: event.name,
            description: `CPF: ${event.cpf}, Contato: ${event.contact_number}`,
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
};
