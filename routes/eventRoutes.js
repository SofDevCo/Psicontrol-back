const express = require('express');
const router = express.Router();
const { createEvent } = require('../controllers/eventController');

// Exibir formulário de criação de evento
router.get('/create-event-form', (req, res) => {
    res.send(`
        <form action="/events/create-event" method="POST">
            <label for="event_name">Nome do Evento:</label>
            <input type="text" id="event_name" name="event_name" required><br><br>

            <label for="date">Data:</label>
            <input type="date" id="date" name="date" required><br><br>

            <label for="start_time">Hora de Início:</label>
            <input type="time" id="start_time" name="start_time" required><br><br>

            <label for="end_time">Hora de Término:</label>
            <input type="time" id="end_time" name="end_time" required><br><br>

            <button type="submit">Criar Evento</button>
        </form>
    `);
});

// Criar evento
router.post('/create-event', createEvent);

module.exports = router;
