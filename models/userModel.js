const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
    user_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    google_user_id:{
        type: DataTypes.STRING,
        allowNull: true,

    },
    user_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    user_cpf: {
        type: DataTypes.STRING(11),
        allowNull: true,
    },
    user_cnpj:{
        type: DataTypes.STRING(14),
        allowNull: true,
    },
    crp_number: {
        type: DataTypes.STRING(15),
        allowNull: true,    
    },
    user_phone: {
        type: DataTypes.STRING(15),
        allowNull: true,
    },
    user_email: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    access_token: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    refresh_token:{
        type: DataTypes.STRING(255),
        allowNull: true,
    },
}, {
  tableName: 'users',
  timestamps: false,
});

module.exports = { User };