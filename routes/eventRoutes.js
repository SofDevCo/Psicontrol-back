const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const customerController = require("../controllers/customerController");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/select-calendar", (req, res) => {
  res.redirect("http://localhost:3001/select-calendar");
});

// Endpoints para eventos
router.post("/create-event", eventController.createEvent);
router.post("/sync-calendar", eventController.syncCalendar);
router.post("/sync-calendar/:calendarId", eventController.syncCalendar);
router.get("/get-events/:calendarId", eventController.getEventsByCalendar);
router.get("/get-events", eventController.getEvents);
router.get("/calendars", eventController.listCalendars);
router.delete(
  "/cancel/:google_event_id/:calendarId",
  eventController.deleteEvent
);
router.post("/create-customer", customerController.createCustomer);
router.get("/customers", customerController.getCustomers);
router.post(
  "/calendars/selection/:calendarId",
  eventController.saveSelectedCalendars
);

module.exports = router;
