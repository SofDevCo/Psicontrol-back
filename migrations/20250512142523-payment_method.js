"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "payment_method", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.renameColumn(
      "customers_billing_records",
      "payment_bank",
      "payment_method"
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      "customers_billing_records",
      "payment_method",
      "payment_bank"
    );

    await queryInterface.removeColumn("users", "payment_method");
  },
};
