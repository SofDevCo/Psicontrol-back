const { Evento } = require('../models/eventModel');

exports.createEvent = async (event) => {
    return Evento.create(event);
};
