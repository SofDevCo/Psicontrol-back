const { Customer, CustomersBillingRecords, User } = require("../models");
const { Op } = require("sequelize");

exports.getBillingRecordsByMonthAndYear = async (req, res) => {
  const { month, year } = req.query;

  if (!req.user) {
    return res.status(401).json({ error: "Usuário não autenticado." });
  }

  const userId = req.user.user_id;

  if (!month || !year) {
    return res
      .status(400)
      .json({ error: "Os campos 'month' e 'year' são obrigatórios." });
  }

  const billingRecords = await CustomersBillingRecords.findAll({
    where: {
      month_and_year: { [Op.like]: `${year}-${month.padStart(2, "0")}%` },    },
    include: [
      {
        model: Customer,
        where: { user_id: userId },
        attributes: ["customer_name", "customer_id"],
      },
    ],
  });

  if (!billingRecords.length) {
    return res
      .status(404)
      .json({ message: "Nenhum registro encontrado para este mês e ano." });
  }


  const totalConsultations = billingRecords.reduce((acc, record) => {
    const daysArray = record.consultation_days
      ? record.consultation_days.split(",").map((day) => day.trim())
      : [];
    return acc + daysArray.length;
  }, 0);

  const totalRevenue = billingRecords.reduce((acc, record) => {
    const daysArray = record.consultation_days
      ? record.consultation_days.split(",").map((day) => day.trim())
      : [];
    const numConsultations = daysArray.length;
    return acc + (record.consultation_fee || 0) * numConsultations;
  }, 0);

  res.status(200).json({
    billingRecords,
    totalConsultations,
    totalRevenue: parseFloat(totalRevenue).toFixed(2),
  });
};


