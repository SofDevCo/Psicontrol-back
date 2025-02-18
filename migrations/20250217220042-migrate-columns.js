"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      ALTER TABLE public.customers_billing_records
      ADD COLUMN fee_updated_at DATE;
    `);
  },
};