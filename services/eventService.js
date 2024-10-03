const { Event } = require("../models/eventModel");

exports.createEvent = async (event) => {
  try {
    return await Event.create(event);
  } catch (error) {}
};

exports.eventExists = async (googleEventId) => {
  try {
    return await Event.findOne({ where: { google_event_id: googleEventId } });
  } catch (error) {}
};

exports.deleteEventById = async (customers_id) => {
  try {
    const result = await Event.destroy({
      where: { customers_id },
    });
    return result;
  } catch (error) {
    throw error;
  }
};

exports.cancelEventByGoogleId = async (googleEventId) => {
  try {
    const result = await Event.update(
      { status: "cancelado" },
      { where: { google_event_id: googleEventId } }
    );
  } catch (error) {}
};

exports.saveEvent = async (eventData) => {
  try {
    return await Event.create(eventData);
  } catch (error) {}
};

exports.updateEvent = async (eventData) => {
  try {
    const [affectedRows] = await Event.update(eventData, {
      where: { google_event_id: eventData.google_event_id },
    });
  } catch (error) {}
};
