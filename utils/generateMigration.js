const fs = require('fs');
const path = require('path');
const { sequelize } = require("../config/database");
const { QueryInterface, Sequelize } = require('sequelize');
require("dotenv").config();

const queryInterface = sequelize.getQueryInterface();
const modelsDir = path.join(__dirname, '../models');

const generateCreateMigration = (tableName, rawAttributes) => {
  const timestamp = new Date().toISOString().replace(/[-T:\.Z]/g, '');
  const migrationName = `create_${tableName}_table_${timestamp}.js`;

  const migrationPath = path.join(__dirname, '../migrations', migrationName);

  const migrationContent = `
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.createTable('${tableName}', ${JSON.stringify(rawAttributes, null, 2)});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.dropTable('${tableName}');
  }
};
  `;

  fs.writeFileSync(migrationPath, migrationContent);
  console.log(`Migration criada: ${migrationName}`);
};

const generateAlterMigration = (tableName, newAttributes, existingAttributes) => {
  const timestamp = new Date().toISOString().replace(/[-T:\.Z]/g, '');
  const migrationName = `alter_${tableName}_table_${timestamp}.js`;

  const migrationPath = path.join(__dirname, '../migrations', migrationName);

  const alterColumns = []; 

  Object.keys(newAttributes).forEach((columnName) => {
    if (!existingAttributes[columnName]) {
      alterColumns.push(`addColumn('${columnName}', ${JSON.stringify(newAttributes[columnName])})`);
    }
  });

  if (alterColumns.length > 0) {
    const migrationContent = `
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.${alterColumns.join('.\n    ')};
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.${alterColumns.reverse().join('.\n    ')};
  }
};
    `;
    
    fs.writeFileSync(migrationPath, migrationContent);
    console.log(`Migration de alteração criada: ${migrationName}`);
  } else {
    console.log(`Tabela ${tableName} já está sincronizada com o modelo. Nenhuma migração necessária.`);
  }
};

fs.readdirSync(modelsDir).forEach(async (file) => {
  if (file.endsWith('Model.js')) {
    const modelModule = require(path.join(modelsDir, file));
    const model = Object.values(modelModule)[0];

    if (!model || !model.name) {
      console.error(`Erro: O arquivo ${file} não é um model válido ou está mal definido.`);
      return;
    }

    const tableName = model.getTableName ? model.getTableName() : model.name.toLowerCase() + 's';

    console.log(`Verificando a tabela para o modelo: ${tableName}`);

    try {
      const existingAttributes = await queryInterface.describeTable(tableName);

      console.log(`Tabela ${tableName} já existe. Verificando alterações...`);

      const newAttributes = model.rawAttributes;
      const diffColumns = [];

      Object.keys(newAttributes).forEach((columnName) => {
        if (!existingAttributes[columnName]) {
          diffColumns.push(columnName);
        }
      });

      if (diffColumns.length > 0) {
        generateAlterMigration(tableName, newAttributes, existingAttributes);
      } else {
        console.log(`Nenhuma alteração detectada para a tabela ${tableName}.`);
      }
    } catch (error) {
      console.log(`Tabela ${tableName} não encontrada. Criando migração de criação...`);
      generateCreateMigration(tableName, model.rawAttributes);
    }
  }
});
