const { income, User } = require("../models");

const revenueController = {
  addRevenue: async (req, res) => {
    try {
      const { date, name, value } = req.body;
      const user = req.user;

      const revenue = await income.create({
        user_id: user.user_id,
        date,
        name,
        value,
        type: "revenue",
      });
      res.status(201).json(revenue);
    } catch (error) {
      res.status(500).json({ error: "Erro ao adicionar receita" });
    }
  },

  addExpense: async (req, res) => {
    try {
      const { date, name, value } = req.body;
      const user = req.user;
      const expense = await income.create({
        user_id: user.user_id,
        date,
        name,
        value,
        type: "expense",
      });
      res.status(201).json(expense);
    } catch (error) {
      res.status(500).json({ error: "Erro ao adicionar despesa" });
    }
  },

  getRevenueByUserId: async (req, res) => {
    try {
      const user_id = req.user.user_id;
      const revenues = await income.findAll({
        where: { user_id, type: "revenue" },
      });

      res.status(200).json(revenues);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar receitas" });
    }
  },

  getExpenseByUserId: async (req, res) => {
    try {
      const user_id = req.user.user_id;
      const expenses = await income.findAll({
        where: { user_id, type: "expense" },
      });

      res.status(200).json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar despesas" });
    }
  },

  deleteRevenue: async (req, res) => {
    try {
      const { id } = req.params;

      const revenue = await income.destroy({
        where: { id },
      });

      if (revenue > 0) {
        res.status(200).json({ message: "Receita deletada com sucesso" });
      } else {
        res.status(404).json({ error: "Receita não encontrada" });
      }
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar receita" });
    }
  },

  deleteExpense: async (req, res) => {
    try {
      const { id } = req.params;
      const expense = await income.destroy({
        where: { id },
      });
      if (expense > 0) {
        res.status(200).json({ message: "Despesa deletada com sucesso" });
      } else {
        res.status(404).json({ error: "Despesa não encontrada" });
      }
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar despesa" });
    }
  },
  
  deleteExpense: async (req, res) => {
    
    try {
      const { id } = req.params; 
      const expense = await income.destroy({
        where: { id } 
      });
  
      if (expense > 0) {
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
  
  

  getEntriesByUserId: async (req, res) => {
    try {
      const user = req.user;
      const entries = await User.findOne({
        where: { user_id: user.user_id },
      });
      res.status(200).json(entries);
    } catch (error) {
      res.status(500).json({ error: "Erro ao obter entradas" });
    }
  },
};

module.exports = revenueController;
