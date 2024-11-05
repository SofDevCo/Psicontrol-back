const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const { Calendar } = require("./calendarModel");

const Event = sequelize.define(
  "Event",
  {
    customers_id: {
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
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Customer",
        key: "customer_id",
      },
    },
    montr_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    event_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    google_event_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    calendar_id: {
      type: DataTypes.STRING,
      references: {
        model: Calendar,
        key: "id",
      },
      allowNull: true,
    },
  },
  {
    tableName: "events",
    timestamps: false,
  }
);

module.exports = { Event };
