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
      allowNull: true,
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
      defaultValue: `Olá, {{nome}}!
      Estou enviando esta mensagem para passar os valores dos atendimentos realizadas no mês de {{mês}}.
       
      Foram realizados um total de {{numero_de_consultas}} atendimentos, nos dias {{dias}}.
     
      O valor total é de R$ {{valor_total}}.
     
      Seguem abaixo os dados para o pagamento:
      Código Pix:
      Banco: Agencia: 0000
      CC: 0000000
     
      Atenciosamente,
      Fulana(o) de tal`,
    },
    clinic_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    image: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    registration_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    occupation: {
      type: DataTypes.ENUM(
        "Psicólogo(a)",
        "Psiquiatra",
        "Administro uma clínica/consultório",
        "Estudante",
        "Outro Profissional da Saúde"
      ),
      allowNull: false,
    },
    current_plan: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: false,
  }
);

module.exports = { User };
