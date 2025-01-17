"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      ALTER TABLE public.customers
      ADD COLUMN customer_second_name character varying(255),
      ADD COLUMN customer_calendar_name character varying(255) NOT NULL DEFAULT 'default_value',
      ADD COLUMN customer_personal_message text;

      ALTER TABLE public.customers_billing_records
      ADD COLUMN bill_of_sale boolean;
    `);
  },
};
