const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

// Definindo o modelo Evento diretamente aqui
const Evento = sequelize.define('Evento', {
    customers_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    event_name: {
        type: Sequelize.STRING,
    },
    date: {
        type: Sequelize.DATEONLY,
    },
    google_event_id: {
        type: Sequelize.STRING,
    },
    created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
    },
}, {
    tableName: 'events',
    timestamps: false,
});

exports.createEvent = async (event) => {
    try {
        return await Evento.create(event);
    } catch (error) {
        console.error('Erro ao criar evento:', error);
        throw error;
    }
};
