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
        console.error('Erro ao verificar a existÃªncia do evento:', error);
        throw error;
    }
};

exports.deleteEventById = async (customers_id) => {
    try {
        const result = await Evento.destroy({
            where: { customers_id }
        });
        if (result === 0) {
            // console.log('Nenhum evento encontrado para deletar com customers_id:', customers_id);
        } else {
            // console.log('Evento deletado com sucesso com customers_id:', customers_id);
        }
        return result;
    } catch (error) {
        console.error('Erro ao excluir evento:', error);
        throw error;
    }
};

exports.cancelEventByGoogleId = async (googleEventId) => {
    try {
        const result = await Evento.update(
            { status: 'cancelado' },
            { where: { google_event_id: googleEventId } }
        );

        if (result[0] === 0) {
            // console.log('Nenhum evento encontrado para cancelar com google_event_id:', googleEventId);
        } else {
            // console.log('Evento cancelado com sucesso com google_event_id:', googleEventId);
        }
    } catch (error) {
        console.error('Erro ao cancelar evento no banco de dados:', error);
        throw new Error('Erro ao cancelar evento no banco de dados.');
    }
};

exports.saveEvent = async (eventData) => {
    try {
        // console.log('Salvando evento:', eventData); 
        return await Evento.create(eventData);
    } catch (error) {
        console.error('Erro ao criar evento:', error);
        throw new Error('Erro ao criar evento.');
    }
};

exports.updateEvent = async (eventData) => {
    try {
        // console.log('Atualizando evento:', eventData); 
        const [affectedRows] = await Evento.update(eventData, {
            where: { google_event_id: eventData.google_event_id }
        });
        if (affectedRows === 0) {
            // console.log('Nenhum evento encontrado para atualizar com google_event_id:', eventData.google_event_id);
        } else {
            // console.log('Evento atualizado com sucesso com google_event_id:', eventData.google_event_id);
        }
    } catch (error) {
        console.error('Erro ao atualizar evento:', error);
        throw new Error('Erro ao atualizar evento.');
    }
};
