const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

// Exibir formulário de criação de evento (caso esteja usando no front-end)
router.get('/create-event-form', (req, res) => {
    res.redirect('http://localhost:3001/create-event-form');
});

// Rota para criar um evento
router.post('/create-event', eventController.createEvent);

// Rota para obter todos os eventos
router.get('/get-events', eventController.getEvents);

// Rota para excluir um evento
router.delete('/delete-event/:google_event_id', eventController.deleteEvent);

module.exports = router;
