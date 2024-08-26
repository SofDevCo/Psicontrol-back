const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');
const { Evento } = require('../models/eventModel');

// Função para criar um evento
exports.createEvent = async (event) => {
    try {
        return await Evento.create(event);
    } catch (error) {
        console.error('Erro ao criar evento:', error);
        throw error;
    }
};

// Função para verificar se um evento existe no banco de dados
exports.eventExists = async (googleEventId) => {
    try {
        return await Evento.findOne({ where: { google_event_id: googleEventId } });
    } catch (error) {
        console.error('Erro ao verificar a existência do evento:', error);
        throw error;
    }
};

// Função para deletar um evento pelo ID do cliente
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

// Função para deletar um evento pelo ID do Google Event
exports.deleteEventByGoogleId = async (googleEventId) => {
    try {
        const result = await Evento.destroy({
            where: { google_event_id: googleEventId }
        });
        return result;
    } catch (error) {
        console.error('Erro ao deletar evento pelo Google Event ID:', error);
        throw error;
    }
};
