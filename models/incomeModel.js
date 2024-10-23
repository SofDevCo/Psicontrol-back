const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const { User } = require("./userModel");

const income = sequelize.define(
  "income",
  {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "user_id",
      },
    },
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    month_year: {  // New field to store month and year
      type: DataTypes.STRING(7),  // Format MM/YY
      allowNull: false,
    },    
    type: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
  },
  {
    tableName: "income",
    timestamps: false,
  }
);

module.exports = { income };
