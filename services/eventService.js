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

// Função para verificar se um evento existe com base no google_event_id
exports.eventExists = async (googleEventId) => {
    try {
        return await Evento.findOne({ where: { google_event_id: googleEventId } });
    } catch (error) {
        console.error('Erro ao verificar a existência do evento:', error);
        throw error;
    }
};

// Função para excluir um evento pelo ID de cliente
exports.deleteEventById = async (customers_id) => {
    try {
        const result = await Evento.destroy({
            where: { customers_id }
        });
        if (result === 0) {
            console.log('Nenhum evento encontrado para deletar com customers_id:', customers_id);
        } else {
            console.log('Evento deletado com sucesso com customers_id:', customers_id);
        }
        return result;
    } catch (error) {
        console.error('Erro ao excluir evento:', error);
        throw error;
    }
};

// Função para excluir um evento pelo google_event_id
exports.deleteEventByGoogleId = async (googleEventId) => {
    try {
        const result = await Evento.destroy({
            where: { google_event_id: googleEventId }
        });
        if (result === 0) {
            console.log('Nenhum evento encontrado para deletar com google_event_id:', googleEventId);
        } else {
            console.log('Evento deletado com sucesso com google_event_id:', googleEventId);
        }
    } catch (error) {
        console.error('Erro ao deletar evento do banco de dados:', error);
        throw new Error('Erro ao deletar evento do banco de dados.');
    }
};


// Função para salvar um evento
exports.saveEvent = async (eventData) => {
    try {
        console.log('Salvando evento:', eventData); 
        return await Evento.create(eventData);
    } catch (error) {
        console.error('Erro ao criar evento:', error);
        throw new Error('Erro ao criar evento.');
    }
};

// Função para atualizar um evento
exports.updateEvent = async (eventData) => {
    try {
        console.log('Atualizando evento:', eventData); 
        const [affectedRows] = await Evento.update(eventData, {
            where: { google_event_id: eventData.google_event_id }
        });
        if (affectedRows === 0) {
            console.log('Nenhum evento encontrado para atualizar com google_event_id:', eventData.google_event_id);
        } else {
            console.log('Evento atualizado com sucesso com google_event_id:', eventData.google_event_id);
        }
    } catch (error) {
        console.error('Erro ao atualizar evento:', error);
        throw new Error('Erro ao atualizar evento.');
    }
};
