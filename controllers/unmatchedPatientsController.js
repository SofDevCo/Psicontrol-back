const { Customer,Event, Calendar } = require("../models");

exports.getUnmatchedPatients = async (req, res, next) => {

  const enabledCalendars = await Calendar.findAll({
    where: {
      user_id: req.user.user_id,
      enabled: true,
    },
    attributes: ['calendar_id'],
  })

  const calendarIds = enabledCalendars.map((calendar) => calendar.calendar_id );

  if(calendarIds.length === 0 ){
    return res.status(200).json({
      message: "Nenhum calendário sincronizado",
      unmatchedEvents: [],
    })
  }

  const unmatchedEvents = await Event.findAll({
    where: {
      user_id: req.user.user_id,
      customer_id: null,
      calendar_id: calendarIds,
    },
    attributes: ['customers_id', 'event_name', 'date', 'google_event_id', 'calendar_id'],
  });

  const response = unmatchedEvents.map(event => ({
    google_event_id: event.google_event_id,
    customers_id: event.customers_id,
    name: event.event_name,
    date: event.date,
    calendar_id: event.calendar_id,
  }));

  res.json(response);
};

