const { Event } = require("../models/eventModel");

exports.createEvent = async (event) => {
  return await Event.create(event);
};

exports.eventExists = async (googleEventId) => {
  return await Event.findOne({ where: { google_event_id: googleEventId } });
};

exports.deleteEventById = async (customers_id) => {
  const result = await Event.destroy({
    where: { customers_id },
  });
  return result;
};

exports.cancelEventByGoogleId = async (googleEventId) => {
  await Event.update(
    { status: "cancelado" },
    { where: { google_event_id: googleEventId } }
  );
};

exports.saveEvent = async (eventData) => {
  return await Event.create(eventData);
};

exports.updateEvent = async (eventData) => {
  const [affectedRows] = await Event.update(eventData, {
    where: { google_event_id: eventData.google_event_id },
  });
  return affectedRows;
};
