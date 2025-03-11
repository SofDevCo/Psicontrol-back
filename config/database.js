const { Sequelize } = require('sequelize');
require("dotenv").config();

const { DATABASE_URL, DATABASE_URL_STAGING, NODE_ENV } = process.env;

const sequelize = new Sequelize(
  NODE_ENV === "staging" ? DATABASE_URL_STAGING : DATABASE_URL,
  { dialect: 'postgres' }
);

module.exports = { sequelize };
