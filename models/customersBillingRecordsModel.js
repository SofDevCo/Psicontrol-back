const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const { Customer } = require("./customerModel");

const CustomersBillingRecords = sequelize.define(
  "CustomersBillingRecords",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Customer",
        key: "customer_id",
      },
    },
    month_and_year: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    total_consultation_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    payment_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    payment_bank: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    was_charged: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    payment_status: {
      type: DataTypes.ENUM("aberto", "pago", "parcial"),
      allowNull: false,
    },
    sending_invoice: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
  },
  {
    tableName: "Customers_billing_records",
    timestamps: false,
  }
);

module.exports = { CustomersBillingRecords };
