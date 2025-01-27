const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const customerController = require("../controllers/customerController");
const unmatchedPatientsController = require("../controllers/unmatchedPatientsController");
const {checkAndHandleCalendars} = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/select-calendar", (req, res) => {
  res.redirect(`${process.env.API_URL}/select-calendar`);
});
router.get("/check-calendars", checkAndHandleCalendars);

// Endpoints para eventos
router.post("/create-event", eventController.createEvent);
router.post("/sync-calendar", eventController.syncCalendar);
router.post("/sync-calendar/:calendarId", eventController.syncCalendar);
router.get("/get-events/:calendarId", eventController.getEventsByCalendar);
router.get("/get-events", eventController.getEvents);
router.get("/unmatched-patients", verifyToken, unmatchedPatientsController.getUnmatchedPatients);
router.delete("/unmatched-patients/:google_event_id", eventController.deleteUnmatchedEvent);
router.get("/calendars", eventController.listCalendars);
router.post("/linkCustomerToEvent", customerController.linkCustomerToEvent);
router.delete(
  "/cancel/:google_event_id/:calendarId",
  eventController.deleteEvent
);
router.post("/create-customer", customerController.createCustomer);
router.get("/customers", customerController.getCustomers);
router.put("/customers/:customerId", customerController.deleteCustomer);
router.put("/customers/:customerId", customerController.editCustomer);
router.get("/customers/:customerId/profile", customerController.getProfileCustomer);
router.put("/customers/:customerId/message",customerController.updateCustomerMessage);
router.put("/customers/:customerId/archive", customerController.archiveCustomer);
router.get("/customers/archived", customerController.getArchivedCustomers); 
router.post(
  "/calendars/selection/:calendarId",
  eventController.saveSelectedCalendars
);

module.exports = router;
