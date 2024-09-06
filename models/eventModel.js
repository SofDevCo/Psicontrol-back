const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { Calendar } = require('./calendarModel');

const Evento = sequelize.define('Evento', {
    customers_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    event_name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    google_event_id: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    calendar_id: { 
        type: DataTypes.STRING,
        references: {
            model: Calendar,
            key: 'id'
        },
        allowNull: true,
    }
}, {
    tableName: 'events',
    timestamps: false,
});

module.exports = { Evento };