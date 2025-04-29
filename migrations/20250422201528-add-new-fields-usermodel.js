"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TYPE public."enum_users_occupation" AS ENUM (
        'Psicólogo(a)',
        'Psiquiatra',
        'Administro uma clínica/consultório',
        'Estudante',
        'Outro Profissional da Saúde'
      );

      ALTER TABLE public.users
      ADD COLUMN registration_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      ADD COLUMN occupation public."enum_users_occupation",
      ADD COLUMN current_plan VARCHAR(100);

      UPDATE public.users
      SET occupation = 'Estudante'
      WHERE occupation IS NULL;

      ALTER TABLE public.users
      ALTER COLUMN occupation SET NOT NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      ALTER TABLE public.users
      DROP COLUMN current_plan,
      DROP COLUMN occupation,
      DROP COLUMN registration_date;
      DROP TYPE IF EXISTS public."enum_users_occupation";
    `);
  },
};
