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
      type: DataTypes.STRING,
      allowNull: true,
    },
    total_consultation_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    consultation_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    consultation_days: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    num_consultations: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    payment_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
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
      allowNull: true,
    },
    sending_invoice: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    bill_of_sale: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    fee_updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
  },
  {
    tableName: "customers_billing_records",
    timestamps: false,
  }
);

module.exports = { CustomersBillingRecords };
