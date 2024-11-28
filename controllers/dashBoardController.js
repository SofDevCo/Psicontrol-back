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

  const monthYear = `${year}-${month.padStart(2, "0")}`;

  try {
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

    if (!billingRecords.length) {
      return res
        .status(404)
        .json({ message: "Nenhum registro encontrado para este mês e ano." });
    }

    const customersWithBillingRecords = billingRecords.reduce((acc, record) => {
      const customer = record.Customer || {};

      const daysArray = record.consultation_days
        ? record.consultation_days.split(",").map((day) => day.trim())
        : [];
      const numConsultations = daysArray.length;

      const existingCustomer = acc.find((item) => item.customer_id === record.customer_id);

      if (existingCustomer) {
        existingCustomer.num_consultations += numConsultations;
        existingCustomer.total_consultation_fee = (
          parseFloat(existingCustomer.total_consultation_fee) +
          parseFloat(record.consultation_fee || 0) * numConsultations
        ).toFixed(2);
        existingCustomer.consultation_days += `, ${record.consultation_days || ""}`.trim();
      } else {
        acc.push({
          customer_id: record.customer_id,
          customer_name: customer.customer_name,
          consultation_fee: record.consultation_fee,
          consultation_days: record.consultation_days || "",
          num_consultations: numConsultations,
          total_consultation_fee: (
            parseFloat(record.consultation_fee || 0) * numConsultations
          ).toFixed(2),
        });
      }

      return acc;
    }, []);


    res.status(200).json(customersWithBillingRecords);
  } catch (error) {
    console.error("Erro ao buscar registros:", error);
    res.status(500).json({ error: "Erro no servidor ao buscar registros." });
  }
};
