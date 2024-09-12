const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Customer = sequelize.define('Customer', {
    customer_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users', // Nome da tabela de usuários em minúsculo
            key: 'user_id', // Nome da coluna no modelo User
        },
    },
    customer_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    customer_cpf: {
        type: DataTypes.STRING(11),
        allowNull: false,
    },
    customer_cnpj: {
        type: DataTypes.STRING(14),
        allowNull: true,
    },
    customer_phone: {
        type: DataTypes.STRING(15),
        allowNull: true,
    },
    customer_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    consultation_fee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    patient_status: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    alternative_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    alternative_cpf: {
        type: DataTypes.STRING(11),
        allowNull: true,
    },
}, {
    tableName: 'customers', // Nome da tabela de clientes em minúsculo
    timestamps: false,
});

module.exports = { Customer };
