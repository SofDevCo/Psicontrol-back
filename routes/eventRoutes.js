const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

router.get('/create-event-form', (req, res) => {
    res.redirect('http://localhost:3001/create-event-form');
});

router.post('/create-event', eventController.createEvent);
router.post('/sync-calendar', eventController.syncCalendar);
router.get('/get-events', eventController.getEvents);
router.delete('/delete-event/:google_event_id', eventController.deleteEvent);

module.exports = router;