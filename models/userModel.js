const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const User = sequelize.define(
  "User",
  {
    user_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    autentication_token: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    user_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    user_cpf: {
      type: DataTypes.STRING(11),
      allowNull: true,
    },
    user_cnpj: {
      type: DataTypes.STRING(14),
      allowNull: true,
    },
    crp_number: {
      type: DataTypes.STRING(15),
      allowNull: true,
    },
    user_phone: {
      type: DataTypes.STRING(15),
      allowNull: true,
    },
    user_email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    access_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    refresh_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    user_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue:
        "Olá, {{nome}}! Estou enviando essa mensagem para passar os valores das consultas realizadas no mês de {{mês}}, nos dias {{dias}}. O valor total dos atendimentos é de R$ {{numero_de_consultas}}. Segue abaixo os dados para pagamento: Código Pix: Banco: Agencia: 0000 CC: 0000000- Atenciosamente, {{clinic_name}}"
    },
    clinic_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    image: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: false,
  }
);

module.exports = { User };
