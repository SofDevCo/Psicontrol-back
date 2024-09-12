const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Calendar = sequelize.define('Calendar',{
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    calendar_name:{
        type: DataTypes.STRING,
        allowNull: true, 
    },
    calendar_id:{
        type: DataTypes.STRING,
        allowNull: false, 
        unique: true,
    }
},{
    tableName: 'calendars',
    timestamps: false,
})

module.exports = { Calendar };