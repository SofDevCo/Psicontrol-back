const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/sequelize'); 

class Session extends Model {}

Session.init(
  {
    sid: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    sess: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    expire: {
      type: DataTypes.DATE(6), 
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Session',
    tableName: 'session',
    indexes: [
      {
        name: 'IDX_session_expire',
        fields: ['expire'],
      },
    ],
    timestamps: false, // Desativa os campos createdAt e updatedAt
  }
);

module.exports = { Session };
