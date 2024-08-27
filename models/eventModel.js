const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

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
    status:{
        type: DataTypes.STRING,
        allowNull:true,
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'events',
    timestamps: false,
});

module.exports = { Evento };
