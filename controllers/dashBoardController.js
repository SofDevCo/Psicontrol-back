const {
  Customer,
  CustomersBillingRecords,
  income,
  Event,
} = require("../models");
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

  const deletedCustomers = await CustomersBillingRecords.findAll({
    where: {
      deleted: { [Op.not]: null },
      month_and_year: { [Op.lte]: `${year}-${month.padStart(2, "0")}` },
    },
    attributes: ["customer_id"],
  });

  const deletedCustomerIds = deletedCustomers.map(
    (record) => record.customer_id
  );

  const billingRecords = await CustomersBillingRecords.findAll({
    where: {
      month_and_year: { [Op.like]: `${year}-${month.padStart(2, "0")}%` },
      deleted: null,
      customer_id: { [Op.notIn]: deletedCustomerIds },
    },
    include: [
      {
        model: Customer,
        where: { user_id: userId },
        attributes: ["customer_name", "customer_id"],
      },
    ],
  });

  const customerIds = billingRecords.map((record) => record.customer_id);

  const activeEvents = await Event.findAll({
    where: {
      customer_id: { [Op.in]: customerIds },
      status: { [Op.not]: "cancelado" },
    },
    attributes: ["customer_id", "date"],
  });

  const activeDaysByCustomer = activeEvents.reduce((acc, event) => {
    const day = event.date.split("-")[2];
    if (!acc[event.customer_id]) acc[event.customer_id] = new Set();
    acc[event.customer_id].add(day);
    return acc;
  }, {});

  let filteredBillingRecords = billingRecords.map((record) => {
    const activeDays = activeDaysByCustomer[record.customer_id] || new Set();
    const filteredDays = record.consultation_days
      ? record.consultation_days
          .split(",")
          .map((day) => day.trim())
          .filter((day) => activeDays.has(day))
      : [];

    return {
      ...record.toJSON(),
      consultation_days: filteredDays.join(", "),
      num_consultations: filteredDays.length,
    };
  });

  filteredBillingRecords = filteredBillingRecords.filter(
    (record) => record.num_consultations > 0
  );

  const totalConsultations = filteredBillingRecords.reduce(
    (acc, record) => acc + record.num_consultations,
    0
  );

  const totalRevenue = filteredBillingRecords.reduce(
    (acc, record) =>
      acc + parseFloat(record.consultation_fee || 0) * record.num_consultations,
    0
  );

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
  const netTime =
    totalConsultations > 0
      ? (netRevenue / totalConsultations).toFixed(2)
      : "0.00";

  const formattedRecords = filteredBillingRecords.map((record) => {
    const consultationFee = parseFloat(record.consultation_fee || 0);
    const totalConsultationFee = record.num_consultations * consultationFee;

    return {
      ...record,
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

exports.revertSendingInvoice = async (req, res) => {
  const { customer_id, month_and_year } = req.body;

  if (!customer_id || !month_and_year) {
    return res.status(400).json({ error: "Dados incompletos." });
  }

  try {
    await CustomersBillingRecords.update(
      {
        sending_invoice: false,
      },
      {
        where: { customer_id, month_and_year },
      }
    );

    res.status(200).json({ message: "Cobrança revertida com sucesso." });
  } catch (error) {
    res.status(500).json({ error: "Erro ao reverter cobrança." });
  }
};

exports.revertPaymentConfirmation = async (req, res) => {
  const { customer_id, month_and_year } = req.body;

  if (!customer_id || !month_and_year) {
    return res.status(400).json({ error: "Dados incompletos." });
  }

  try {
    await CustomersBillingRecords.update(
      {
        was_charged: false,
        payment_status: "",
        payment_amount: null,
      },
      {
        where: { customer_id, month_and_year },
      }
    );

    res
      .status(200)
      .json({ message: "Confirmação de pagamento revertida com sucesso." });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Erro ao reverter confirmação de pagamento." });
  }
};

exports.revertBillOfSale = async (req, res) => {
  const { customer_id, month_and_year } = req.body;

  if (!customer_id || !month_and_year) {
    return res.status(400).json({ error: "Dados incompletos." });
  }

  try {
    await CustomersBillingRecords.update(
      {
        bill_of_sale: false,
      },
      {
        where: { customer_id, month_and_year },
      }
    );

    res.status(200).json({ message: "Recibo revertido com sucesso." });
  } catch (error) {
    res.status(500).json({ error: "Erro ao reverter recibo." });
  }
};

exports.savePayment = async (req, res) => {
  const {
    customer_id,
    month_and_year,
    payment_date,
    payment_method,
    payment_amount,
  } = req.body;

  if (!customer_id || !month_and_year || !payment_date || !payment_method) {
    return res.status(400).json({ error: "Dados incompletos." });
  }

  const billingRecord = await CustomersBillingRecords.findOne({
    where: { customer_id, month_and_year },
  });
  if (!billingRecord) {
    return res.status(404).json({ error: "Registro não encontrado." });
  }

  const daysArray = billingRecord.consultation_days
    ? billingRecord.consultation_days
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean)
    : [];
  const numConsultations = daysArray.length;
  const totalFee =
    parseFloat(billingRecord.consultation_fee) * numConsultations;

  const hasPartial = payment_amount !== undefined;
  let amountToSave, status;

  if (hasPartial) {
    const parsed = parseFloat(payment_amount);

    if (parsed > totalFee) {
      return res.status(400).json({
        error: "Valor de pagamento parcial não pode exceder o total devido.",
      });
    }

    if (parsed === totalFee) {
      amountToSave = parsed.toFixed(2);
      status = "pago";
    } else {
      amountToSave = parsed.toFixed(2);
      status = "parcial";
    }
  } else {
    amountToSave = totalFee.toFixed(2);
    status = "pago";
  }

  const updateData = {
    payment_amount: amountToSave,
    payment_date,
    payment_method,
    was_charged: true,
    payment_status: status,
  };
  if (!hasPartial || status === "pago") {
    updateData.total_consultation_fee = totalFee.toFixed(2);
  }

  await billingRecord.update(updateData);

  const updated = await CustomersBillingRecords.findOne({
    where: { customer_id, month_and_year },
    attributes: [
      "total_consultation_fee",
      "payment_amount",
      "payment_date",
      "payment_method",
      "payment_status",
    ],
  });

  return res.status(200).json({
    message: "Pagamento registrado com sucesso.",
    ...updated.get({ plain: true }),
  });
};

exports.confirmBillOfSale = async (req, res) => {
  const { customer_id, month_and_year } = req.body;

  if (!customer_id || !month_and_year) {
    return res.status(400).json({ error: "Dados incompletos." });
  }

  await CustomersBillingRecords.update(
    {
      bill_of_sale: true,
    },
    {
      where: { customer_id, month_and_year },
    }
  );
  res.status(200).json({ message: "Nota fiscal enviada com sucesso!" });
};
