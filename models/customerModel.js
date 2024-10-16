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
    customer_cpf_cnpj: {
      type: DataTypes.STRING(14),
      allowNull: false,
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
    patient_status: {
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
    }
  },
  {
    tableName: "customers",
    timestamps: false,
  }
);

module.exports = { Customer };
