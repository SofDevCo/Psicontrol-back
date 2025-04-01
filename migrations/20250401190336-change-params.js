'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      ALTER TABLE "users"
      ALTER COLUMN "user_message" SET DEFAULT 'Olá, {{nome}}! Estou enviando essa mensagem para passar os valores das consultas realizadas no mês de {{mês}}, nos dias {{dias}}. O valor total dos atendimentos é de R$ {{valor_total}}. Seguem abaixo os dados para pagamento: Código Pix: Banco: Agencia: 0000 CC: 0000000 Atenciosamente, Fulana(o) de tal';
    `);
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      ALTER TABLE "users"
      ALTER COLUMN "user_message" DROP DEFAULT;
    `);
  }
};

