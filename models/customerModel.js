const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Customer = sequelize.define(
  "Customer",
  {
    customer_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    customer_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    customer_second_name:{
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    customer_calendar_name:{
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    customer_cpf_cnpj: {
      type: DataTypes.STRING(14),
      allowNull: true,
      defaultValue: true,
    },
    customer_phone: {
      type: DataTypes.STRING(15),
      allowNull: true,
    },
    customer_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    consultation_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    archived: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    alternative_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    alternative_cpf_cnpj: {
      type: DataTypes.STRING(14),
      allowNull: true,
    },
    customer_dob: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    customer_emergency_contact: {
      type: DataTypes.STRING(15),
      allowNull: true,
    },
    customer_personal_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    customer_emergency_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    customer_emergency_relationship: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    }
  },
  {
    tableName: "customers",
    timestamps: false,
  }
);

module.exports = { Customer };
