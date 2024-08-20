const express = require('express');
const router = express.Router();
const { createEvent } = require('../controllers/eventController');

// Exibir formulário de criação de evento
router.get('/create-event-form', (req, res) => {
    res.send(`
        <form action="/events/create-event" method="POST">
            <label for="name">Nome:</label>
            <input type="text" id="name" name="name" required><br>
            <label for="cpf">CPF:</label>
            <input type="text" id="cpf" name="cpf" required><br>
            <label for="contact_number">Número de Contato:</label>
            <input type="text" id="contact_number" name="contact_number" required><br>
            <label for="date">Data:</label>
            <input type="date" id="date" name="date" required><br>
            <label for="start_time">Hora de Início:</label>
            <input type="time" id="start_time" name="start_time" required><br>
            <label for="end_time">Hora de Término:</label>
            <input type="time" id="end_time" name="end_time" required><br>
            <button type="submit">Criar Evento</button>
        </form>
    `);
});

// Criar evento
router.post('/create-event', createEvent);

module.exports = router;
