const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

router.get('/create-event-form', (req, res) => {
    res.redirect('http://localhost:3001/create-event-form');
});

router.post('/create-event', eventController.createEvent);
router.post('/sync-calendar', eventController.syncCalendar);
router.post('/sync-calendar/:calendarId', eventController.syncCalendar);
router.get('/get-events/:calendarId', eventController.getEventsByCalendar);
router.get('/get-events', eventController.getEvents);
router.get('/calendars', eventController.listCalendars);
router.delete('/cancel/:google_event_id/:calendarId', eventController.deleteEvent);

module.exports = router;