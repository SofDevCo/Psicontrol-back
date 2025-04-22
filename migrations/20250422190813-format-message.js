"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      ALTER TABLE "users"
      ALTER COLUMN "user_message" SET DEFAULT 'Olá, {{nome}}!
      Estou enviando esta mensagem para passar os valores dos atendimentos realizadas no mês de {{mês}}.
       
      Foram realizados um total de {{numero_de_consultas}} atendimentos, nos dias {{dias}}.
     
      O valor total é de R$ {{valor_total}}.
     
      Seguem abaixo os dados para o pagamento:
      Código Pix:
      Banco: Agencia: 0000
      CC: 0000000
     
      Atenciosamente,
      Fulana(o) de tal';
    `);
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      ALTER TABLE "users"
      ALTER COLUMN "user_message" DROP DEFAULT;
    `);
  },
};
