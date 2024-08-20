const { google } = require('googleapis');
const { oauth2Client } = require('../config/oauth2');
const { Evento } = require('../models/eventModel');

const createEvent = async (req, res) => {
    try {
        const event = req.body;
        console.log('Dados recebidos no backend:', event);

        if (!event.name || !event.cpf || !event.contact_number || !event.date || !event.start_time || !event.end_time) {
            return res.status(400).send('Dados inválidos.');
        }

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const eventResponse = await calendar.events.insert({
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

        await Evento.create(event);

        res.send(`Evento criado: <a href="${eventResponse.data.htmlLink}">${eventResponse.data.htmlLink}</a>`);
    } catch (error) {
        console.error('Erro ao criar evento:', error);
        res.status(500).send('Erro ao criar evento.');
    }
};

module.exports = { createEvent };
