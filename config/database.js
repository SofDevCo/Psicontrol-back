const { Sequelize } = require('sequelize');
require("dotenv").config();
const { DATABASE_URL } = process.env;

const sequelize = new Sequelize(DATABASE_URL,{
    dialect: 'postgres',
})

module.exports = { sequelize }; 
