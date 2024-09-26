const { income } = require('../models/incomeModel'); // Certifique-se de que o caminho está correto

const revenueController = {
  Revenue: async (req, res) => {
    try {
      console.log('Função Revenue foi chamada');
      const { user_id, date, name, value } = req.body;

      console.log('Dados recebidos no corpo da requisição:', req.body);

      const revenue = await income.create({
        user_id,
        date,
        name,
        value,
        type: 'revenue',
      });

      console.log('Nova receita criada:', revenue);

      res.status(201).json(revenue); // Retorna a receita criada
    } catch (error) {

      console.error("erros: ", error.message);
      res.status(500).json({ error: 'Erro ao adicionar receita', }); // Retorna um erro caso ocorra
    }
  },

  // Função para adicionar uma despesa
  addExpense: async (req, res) => {
    try {
      console.log('Função addExpense foi chamada');

      console.log('Dados recebidos no corpo da requisição:', req.body);
      const { user_id, date, name, value } = req.body; // Recebe os dados do corpo da requisição

      const expense = await income.create({
        user_id,
        date,
        name,
        value,
        type: 'expense', // Adiciona um tipo para identificação
      });

      console.log('Nova despesa criada:', expense);

      res.status(201).json(expense); // Retorna a despesa criada
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao adicionar despesa' }); // Retorna um erro caso ocorra
    }
  },

  deleteExpense: async (req, res) => {
    const { id } = req.params;
    try {

      const expense = await income.destroy({
        where: { id }
      });

      if (expense) {
        console.log('Despesa deletada com sucesso:', expense);
        res.status(200).json({ message: 'Despesa deletada com sucesso' });
      } else {
        res.status(404).json({ error: 'Despesa não encontrada' });
      }
    } catch (error) {
      console.error("Erro ao deletar despesa:", error.message);
      res.status(500).json({ error: 'Erro ao deletar despesa' });
    }
  },

  deleteRevenue: async (req, res) => {
    try {
      console.log('Função deleteRevenue foi chamada');
      const { id } = req.params;

      console.log('ID da receita a ser deletada:', id);

      const revenue = await income.destroy({
        where: { id }
      });

      if (revenue) {
        console.log('Receita deletada com sucesso:', revenue);
        res.status(200).json({ message: 'Receita deletada com sucesso' });
      } else {
        res.status(404).json({ error: 'Receita não encontrada' });
      }
    } catch (error) {
      console.error("Erro ao deletar receita:", error.message);
      res.status(500).json({ error: 'Erro ao deletar receita' });
    }
  },

  // Função para obter entradas por user_id
  getEntriesByUserId: async (req, res) => {
    try {
      const { user_id } = req.params; // Obtém o user_id da rota

      const entries = await income.findAll({
        where: { user_id },
      });
      console.log('Entradas retornadas do banco de dados:', entries);
      res.status(200).json(entries); // Retorna as entradas encontradas
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter entradas' }); // Retorna um erro caso ocorra
    }
  },
};

module.exports = revenueController;
