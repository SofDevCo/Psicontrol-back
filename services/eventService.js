const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');
const { Evento } = require('../models/eventModel');

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

exports.saveEvent = async (eventData) => {
    try {
        console.log('Salvando evento:', eventData); 
        return await Evento.create(eventData);
    } catch (error) {
        console.error('Erro ao criar evento:', error);
        throw new Error('Erro ao criar evento.');
    }
};

exports.updateEvent = async (eventData) => {
    try {
        console.log('Atualizando evento no banco de dados:', eventData);
        await Evento.update(eventData, {
            where: { google_event_id: eventData.google_event_id }
        });
    } catch (error) {
        console.error('Erro ao atualizar evento:', error);
        throw new Error('Erro ao atualizar evento.');
    }
};