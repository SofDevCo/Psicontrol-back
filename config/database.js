const { Sequelize } = require('sequelize');
require("dotenv").config();
const { DB_DATABASE, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT } = process.env;

const sequelize = new Sequelize(DB_DATABASE, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    dialect: 'postgres',
    port: Number(DB_PORT),
});

module.exports = { sequelize }; 
