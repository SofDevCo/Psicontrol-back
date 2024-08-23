const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');
const { Evento } = require('../models/eventModel')


exports.createEvent = async (event) => {
    try {
        return await Evento.create(event);
    } catch (error) {
        console.error('Erro ao criar evento:', error);
        throw error;
    }
};

exports.eventExists = async (googleEventId) => {
    try {
        return await Evento.findOne({ where: { google_event_id: googleEventId } });
    } catch (error) {
        console.error('Erro ao verificar a existência do evento:', error);
        throw error;
    }
};

exports.deleteEventById = async (customers_id) => {
    try {
        const result = await Evento.destroy({
            where: { customers_id }
        });
        return result;
    } catch (error) {
        console.error('Erro ao excluir evento:', error);
        throw error;
    }
};