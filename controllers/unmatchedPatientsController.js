const { Customer } = require("../models");
const { Event } = require("../models");
const { syncGoogleCalendarWithDatabase } = require("./authController");


exports.getUnmatchedPatients = async (req, res) => {
  const unmatchedEvents = await Event.findAll({
    where: {
      user_id: req.user.user_id,
      customer_id: null,
    },
    attributes: ['customers_id', 'event_name', 'date'],
  });

  const response = unmatchedEvents.map(event => ({
    customers_id: event.customers_id,
    name: event.event_name,
    date: event.date,
  }));

  res.json(response);
};
