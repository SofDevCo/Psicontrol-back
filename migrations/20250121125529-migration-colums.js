"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      ALTER TABLE public.customers
      ADD COLUMN customer_emergency_name character varying(255),
      ADD COLUMN customer_emergency_relationship character varying(20),
      ADD COLUMN deleted boolean;

      ALTER TABLE public.events
      ADD COLUMN deleted boolean;

      ALTER TABLE public.customers_billing_records
      ADD COLUMN deleted boolean;
    `);
  },
};
