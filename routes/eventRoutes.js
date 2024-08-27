const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

router.get('/create-event-form', (req, res) => {
    res.redirect('http://localhost:3001/create-event-form');
});

router.post('/create-event', eventController.createEvent);

router.get('/get-events', eventController.getEvents);

router.delete('/delete-event/:customers_id', eventController.deleteEvent);

module.exports = router;
