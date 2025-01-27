"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      ALTER TABLE public.customers
      ADD COLUMN customer_emergency_contact VARCHAR(15);

    `);
  },
};
