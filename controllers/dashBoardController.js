const { Customer, CustomersBillingRecords, income } = require("../models");
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
      month_and_year: { [Op.like]: `${year}-${month.padStart(2, "0")}%` },
    },
    include: [
      {
        model: Customer,
        where: { user_id: userId },
        attributes: ["customer_name", "customer_id"],
      },
    ],
  });

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

  const monthYear = `${month}/${year.slice(-2)}`;
  const revenues = await income.findAll({
    where: {
      user_id: userId,
      type: "revenue",
      month_year: monthYear,
    },
  });

  const expenses = await income.findAll({
    where: {
      user_id: userId,
      type: "expense",
      month_year: monthYear,
    },
  });

  const totalRevenueFromIncome = revenues.reduce(
    (acc, revenue) => acc + parseFloat(revenue.value || 0),
    0
  );
  const totalExpenseFromIncome = expenses.reduce(
    (acc, expense) => acc + parseFloat(expense.value || 0),
    0
  );
  const netRevenue =
    totalRevenue + totalRevenueFromIncome - totalExpenseFromIncome;
  const netTime = (netRevenue / totalConsultations).toFixed(2);

  const formattedRecords = billingRecords.map((record) => {
    const daysArray = record.consultation_days
      ? record.consultation_days.split(",").map((day) => day.trim())
      : [];
    const numConsultations = daysArray.length;

    const consultationFee = parseFloat(record.consultation_fee || 0);
    const totalConsultationFee = numConsultations * consultationFee;
    return {
      ...record.toJSON(),
      total_consultation_fee:
        totalConsultationFee > 0 ? totalConsultationFee.toFixed(2) : "0.00",
    };
  });

  res.status(200).json({
    billingRecords: formattedRecords,
    totalConsultations,
    totalRevenue: parseFloat(totalRevenue).toFixed(2),
    netRevenue: parseFloat(netRevenue).toFixed(2),
    netTime,
  });
};

exports.Partialpayment = async (req, res) => {
  const { customer_id, month_and_year, payment_amount } = req.body;

  if (!customer_id || !month_and_year || payment_amount === undefined) {
    return res.status(400).json({ error: "Dados incompletos." });
  }

  const billingRecord = await CustomersBillingRecords.findOne({
    where: { customer_id, month_and_year },
  });

  if (!billingRecord) {
    return res.status(404).json({ error: "Registro não encontrado." });
  }

  await CustomersBillingRecords.update(
    {
      payment_amount: parseFloat(payment_amount).toFixed(2),
      payment_status: "parcial",
    },
    {
      where: { customer_id, month_and_year },
    }
  );

  res
    .status(200)
    .json({ message: "Pagamento parcial atualizado com sucesso." });
};


exports.confirmPayment = async (req,res) => {
  const { customer_id, month_and_year} = req.body;

  if (!customer_id || !month_and_year) {
    return res.status(400).json({ error: "Dados incompletos." });
  }
  await CustomersBillingRecords.update(
    {
      was_charged: true, 
      payment_status: "pago", 
    },
    {
      where: { customer_id, month_and_year },
    }
  );

  res.status(200).json({ message: "Pagamento confirmado com sucesso." });
};

exports.confirmBillOfSale = async (req,res) => {
  const {customer_id, month_and_year} = req.body;

  if(!customer_id || !month_and_year) {
    return res.status(400).json({ error: "Dados incompletos." });
  }

  await CustomersBillingRecords.update(
    {
      bill_of_sale: true,
    },{
      where: { customer_id, month_and_year },
    }
  );
  res.status(200).json({ message: "Nota fiscal enviada com sucesso!" });
}