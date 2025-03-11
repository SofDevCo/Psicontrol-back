const { income, User } = require("../models");
const { format, parseISO, subMonths } = require("date-fns");
const { ptBR } = require("date-fns/locale");
const { parseBrazilianDate, formatDateIso } = require("../utils/dateUtils");

const revenueController = {
  addRevenue: async (req, res) => {
    const { date, name, value } = req.body;
    const user = req.user;

    const parsedDate = parseBrazilianDate(date);
    if (!parsedDate) return res.status(400).json({ error: "Data inválida" });

    const isoDate = formatDateIso(parsedDate);
    const monthYear = format(parsedDate, "MM/yy");

    const revenue = await income.create({
      user_id: user.user_id,
      date: isoDate,
      name,
      value,
      type: "revenue",
      month_year: monthYear,
    });
    res.status(201).json(revenue);
  },

  addExpense: async (req, res) => {
    const { date, name, value } = req.body;
    const user = req.user;

    const parsedDate = parseBrazilianDate(date);
    if (!parsedDate) return res.status(400).json({ error: "Data inválida" });

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
  },

  repeatLastMonthEntries: async (req, res) => {
    const { selectedMonth, selectedYear } = req.body;
    const user = req.user;

    if (!selectedMonth || !selectedYear) {
      return res.status(400).json({ error: "Mês e ano são obrigatórios" });
    }

    const selectedDateString = `${selectedYear}-${selectedMonth
      .toString()
      .padStart(2, "0")}-01`;
    const selectedDate = parseISO(selectedDateString);

    if (isNaN(selectedDate))
      return res.status(400).json({ error: "Data selecionada inválida" });

    const currentMonth = format(selectedDate, "MM/yy");
    const existingEntries = await income.findOne({
      where: { user_id: user.user_id, month_year: currentMonth },
    });
    if (existingEntries) return res.status(400).end();

    const lastMonthDate = subMonths(selectedDate, 1);
    const lastMonth = format(lastMonthDate, "MM/yy");

    const revenuesLastMonth = await income.findAll({
      where: { user_id: user.user_id, type: "revenue", month_year: lastMonth },
    });
    const expensesLastMonth = await income.findAll({
      where: { user_id: user.user_id, type: "expense", month_year: lastMonth },
    });

    const newRevenues = revenuesLastMonth.map((revenue) => ({
      user_id: revenue.user_id,
      date: format(selectedDate, "yyyy-MM-dd"),
      name: revenue.name,
      value: revenue.value,
      type: "revenue",
      month_year: currentMonth,
    }));

    const newExpenses = expensesLastMonth.map((expense) => ({
      user_id: expense.user_id,
      date: format(selectedDate, "yyyy-MM-dd"),
      name: expense.name,
      value: expense.value,
      type: "expense",
      month_year: currentMonth,
    }));

    const createdRevenues = await income.bulkCreate(newRevenues);
    const createdExpenses = await income.bulkCreate(newExpenses);

    res.status(201).json({
      message: "Entradas do mês passado duplicadas com sucesso.",
      newRevenues: createdRevenues,
      newExpenses: createdExpenses,
    });
  },

  getRevenueByUserId: async (req, res) => {
    const { monthYear } = req.query;
    const user_id = req.user.user_id;

    const whereClause = { user_id, type: "revenue" };
    if (monthYear) whereClause.month_year = monthYear;

    const revenues = await income.findAll({ where: whereClause });
    res.status(200).json(revenues);
  },

  getExpenseByUserId: async (req, res) => {
    const { monthYear } = req.query;
    const user_id = req.user.user_id;

    const whereClause = { user_id, type: "expense" };
    if (monthYear) whereClause.month_year = monthYear;

    const expenses = await income.findAll({ where: whereClause });
    res.status(200).json(expenses);
  },

  getEntriesByMonthAndYear: async (req, res) => {
    const { month, year } = req.query;
    const user_id = req.user.user_id;

    if (!month || !year)
      return res.status(400).json({ message: "Mês e ano são obrigatórios." });

    const monthYear = `${month}/${year.slice(-2)}`;
    const revenues = await income.findAll({
      where: { ...whereClause, type: "revenue", month_year: monthYear },
    });
    const expenses = await income.findAll({
      where: { ...whereClause, type: "expense", month_year: monthYear },
    });

    res.status(200).json({ revenues, expenses });
  },

  deleteRevenue: async (req, res) => {
    const { id } = req.params;
    const revenue = await income.destroy({ where: { id } });
    if (revenue > 0) {
      res.status(200).json({ message: "Receita deletada com sucesso" });
    } else {
      res.status(404).json({ error: "Receita não encontrada" });
    }
  },

  deleteExpense: async (req, res) => {
    const { id } = req.params;
    const expense = await income.destroy({ where: { id } });
    if (expense > 0) {
      res.status(200).json({ message: "Despesa deletada com sucesso" });
    } else {
      res.status(404).json({ error: "Despesa não encontrada" });
    }
  },

  getEntriesByUserId: async (req, res) => {
    const user = req.user;
    const entries = await User.findAll({ where: { user_id: user.user_id } });
    res.status(200).json(entries);
  },
};

module.exports = revenueController;
