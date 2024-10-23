const { income, User } = require("../models");
const { format, parseISO, subMonths } = require("date-fns");
const { ptBR } = require("date-fns/locale");
const {
  formatDateBrazilian,
  parseISODate,
  parseBrazilianDate,
  formatDateIso,
} = require("../utils/dateUtils"); // Altere para o caminho correto

const revenueController = {
  addRevenue: async (req, res) => {
    try {
      const { date, name, value } = req.body;
      const user = req.user;

      // Usa a função para analisar a data no formato brasileiro
      const parsedDate = parseBrazilianDate(date);
      if (!parsedDate) {
        return res.status(400).json({ error: "Data inválida" });
      }

      const isoDate = formatDateIso(parsedDate); // Converte a data para o formato ISO
      const monthYear = format(parsedDate, "MM/yy"); // Extraí mês e ano

      const revenue = await income.create({
        user_id: user.user_id,
        date: isoDate,
        name,
        value,
        type: "revenue",
        month_year: monthYear,
      });
      res.status(201).json(revenue);
    } catch (error) {
      console.error("Erro ao adicionar receita:", error.message);
      res.status(500).json({ error: "Erro ao adicionar receita" });
    }
  },

  addExpense: async (req, res) => {
    try {
      const { date, name, value } = req.body;
      const user = req.user;

      const parsedDate = parseBrazilianDate(date);
      if (!parsedDate) {
        return res.status(400).json({ error: "Data inválida" });
      }

      const isoDate = formatDateIso(parsedDate);
      const monthYear = format(parsedDate, "MM/yy");

      const expense = await income.create({
        user_id: user.user_id,
        date: isoDate,
        name,
        value,
        type: "expense",
        month_year: monthYear,
      });
      res.status(201).json(expense);
    } catch (error) {
      console.error("Erro ao adicionar despesa:", error.message);
      res.status(500).json({ error: "Erro ao adicionar despesa" });
    }
  },

  repeatLastMonthEntries: async (req, res) => {
    try {
      const { selectedMonth, selectedYear } = req.body;
      const user = req.user;
  
      // Cria uma data com base no mês e ano selecionado
      const selectedDate = parseISO(`${selectedYear}-${selectedMonth}-01`);
      const currentMonth = format(selectedDate, "MM/yy"); // Mês de destino é o mês selecionado
  
      // Verificar se já existem entradas (receitas ou despesas) no mês selecionado
      const existingEntries = await income.findOne({
        where: {
          user_id: user.user_id,
          month_year: currentMonth,
        },
      });
  
      if (existingEntries) {
        // Se já existirem entradas, bloquear a repetição
        return res.status(400).json({
          message: "Já existem entradas no mês selecionado. Não é possível repetir.",
        });
      }
  
      // Calcula o mês anterior ao mês selecionado
      const lastMonthDate = subMonths(selectedDate, 1); // Data do mês anterior
      const lastMonth = format(lastMonthDate, "MM/yy"); // Mês de origem
  
      // Buscar receitas e despesas do mês anterior
      const revenuesLastMonth = await income.findAll({
        where: {
          user_id: user.user_id,
          type: "revenue",
          month_year: lastMonth,
        },
      });
  
      const expensesLastMonth = await income.findAll({
        where: {
          user_id: user.user_id,
          type: "expense",
          month_year: lastMonth,
        },
      });
  
      // Duplicar receitas e despesas para o mês selecionado
      const newRevenues = revenuesLastMonth.map((revenue) => ({
        user_id: revenue.user_id,
        date: formatDateIso(selectedDate), // Usa o mês selecionado como destino
        name: revenue.name,
        value: revenue.value,
        type: "revenue",
        month_year: currentMonth, // Mês de destino é o mês selecionado
      }));
  
      const newExpenses = expensesLastMonth.map((expense) => ({
        user_id: expense.user_id,
        date: formatDateIso(selectedDate), // Usa o mês selecionado como destino
        name: expense.name,
        value: expense.value,
        type: "expense",
        month_year: currentMonth, // Mês de destino é o mês selecionado
      }));
  
      // Inserir no banco de dados as novas receitas e despesas
      const createdRevenues = await income.bulkCreate(newRevenues);
      const createdExpenses = await income.bulkCreate(newExpenses);
  
      res.status(201).json({
        message: "Entradas do mês passado duplicadas com sucesso.",
        newRevenues: createdRevenues,
        newExpenses: createdExpenses,
      });
    } catch (error) {
      console.error("Erro ao duplicar entradas:", error.message);
      res.status(500).json({ error: "Erro ao duplicar entradas" });
    }
  },
  
  

  getRevenueByUserId: async (req, res) => {
    try {
      const { monthYear } = req.query;
      const user_id = req.user.user_id;

      console.log("Consultando receitas para o mês e ano:", monthYear); // Log adicionado

      const whereClause = { user_id, type: "revenue" };
      if (monthYear) whereClause.month_year = monthYear;

      const revenues = await income.findAll({ where: whereClause });

      res.status(200).json(revenues);
    } catch (error) {
      console.error("Erro ao buscar receitas:", error.message);
      res.status(500).json({ error: "Erro ao buscar receitas" });
    }
  },

  getExpenseByUserId: async (req, res) => {
    try {
      const { monthYear } = req.query;
      const user_id = req.user.user_id;

      const whereClause = { user_id, type: "expense" };
      if (monthYear) whereClause.month_year = monthYear;

      const expenses = await income.findAll({ where: whereClause });

      res.status(200).json(expenses);
    } catch (error) {
      console.error("Erro ao buscar despesas:", error.message);
      res.status(500).json({ error: "Erro ao buscar despesas" });
    }
  },

  getEntriesByMonthAndYear: async (req, res) => {
    try {
      const { month, year } = req.query;
      const user_id = req.user.user_id;

      if (!month || !year) {
        return res.status(400).json({ message: "Mês e ano são obrigatórios." });
      }

      const monthYear = `${month}/${year.slice(-2)}`;
      console.log("Consultando entradas para:", monthYear);

      const whereClause = { user_id };
      const revenues = await income.findAll({
        where: { ...whereClause, type: "revenue", month_year: monthYear },
      });
      const expenses = await income.findAll({
        where: { ...whereClause, type: "expense", month_year: monthYear },
      });

      res.status(200).json({ revenues, expenses });
    } catch (error) {
      console.error("Erro ao buscar entradas:", error.message);
      res.status(500).json({ error: "Erro ao buscar entradas" });
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
      console.error("Erro ao deletar receita:", error.message);
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
        console.log("Despesa deletada com sucesso:", expense);
        res.status(200).json({ message: "Despesa deletada com sucesso" });
      } else {
        res.status(404).json({ error: "Despesa não encontrada" });
      }
    } catch (error) {
      console.error("Erro ao deletar despesa:", error.message);
      res.status(500).json({ error: "Erro ao deletar despesa" });
    }
  },

  getEntriesByUserId: async (req, res) => {
    try {
      const user = req.user;
      const entries = await User.findAll({
        where: { user_id: user.user_id },
      });
      res.status(200).json(entries);
    } catch (error) {
      console.error("Erro ao obter entradas:", error.message);
      res.status(500).json({ error: "Erro ao obter entradas" });
    }
  },
};

module.exports = revenueController;
