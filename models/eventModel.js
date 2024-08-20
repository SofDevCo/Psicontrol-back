const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Evento = sequelize.define('Evento', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    cpf: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    contact_number: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    start_time: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    end_time: {
        type: DataTypes.TIME,
        allowNull: false,
    },
}, {
    tableName: 'eventos',
    timestamps: false,
});

module.exports = { Evento };
