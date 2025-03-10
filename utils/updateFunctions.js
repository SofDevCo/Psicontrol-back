const { format, parseISO } = require("date-fns");
const { Event, CustomersBillingRecords, Customer } = require("../models");
const { Op } = require("sequelize");

const updateConsultationDays = async (customerId) => {
  const billingRecords = await CustomersBillingRecords.findAll({
    where: { customer_id: customerId },
    order: [["month_and_year", "DESC"]],
  });

  const events = await Event.findAll({
    where: { customer_id: customerId, status: { [Op.notIn]: ["cancelado"] } },
    attributes: ["date"],
  });

  const daysByMonthYear = events.reduce((acc, event) => {
    const [year, month] = event.date.split("-");
    const monthYear = `${year}-${month}`;
    if (!acc[monthYear]) acc[monthYear] = [];

    const day = format(parseISO(event.date), "dd");
    acc[monthYear].push(day);

    return acc;
  }, {});

  const patient = await Customer.findOne({
    where: { customer_id: customerId },
  });
  const consultationFee = patient
    ? parseFloat(patient.consultation_fee) || 0.0
    : 0.0;

  for (const [monthYear, days] of Object.entries(daysByMonthYear)) {
    const existingRecord = await CustomersBillingRecords.findOne({
      where: { customer_id: customerId, month_and_year: monthYear },
    });

    if (existingRecord && existingRecord.deleted) {
      continue;
    }

    if (existingRecord) {
      await existingRecord.update({
        consultation_days: days.join(", "),
        num_consultations: days.length,
        deleted: existingRecord.deleted,
        consultation_fee: existingRecord.consultation_fee || consultationFee,
      });
    } else {
      await CustomersBillingRecords.create({
        customer_id: customerId,
        month_and_year: monthYear,
        consultation_days: days.join(", "),
        num_consultations: days.length,
        consultation_fee: consultationFee,
        fee_updated_at: new Date(),
      });
    }
  }
};

const updateConsultationFee = async (customerId, newFee, updateFrom) => {
  const now = new Date();

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  const currentMonthYear = formatDate(now);
  const nextMonthYear = formatDate(
    new Date(now.getFullYear(), now.getMonth() + 1, 1)
  );

  if (updateFrom === "current_month") {
    const existingRecord = await CustomersBillingRecords.findOne({
      where: {
        customer_id: customerId,
        month_and_year: currentMonthYear,
      },
    });

    if (!existingRecord) {
      if (newFee === 0) {
        return { success: true };
      }

      return {
        error: true,
        message: "Paciente não possui registro no mês atual.",
        status: 400,
      };
    }

    await existingRecord.update({
      consultation_fee: newFee,
      fee_updated_at: new Date(),
    });

    return { success: true };
  }

  let futureRecordsCondition = {
    customer_id: customerId,
    month_and_year:
      updateFrom === "current_month"
        ? { [Op.gte]: currentMonthYear }
        : { [Op.gte]: nextMonthYear },
  };

  const futureRecords = await CustomersBillingRecords.findAll({
    where: futureRecordsCondition,
    order: [["month_and_year", "ASC"]],
  });

  if (futureRecords.length > 0) {
    await CustomersBillingRecords.update(
      {
        consultation_fee: newFee,
        fee_updated_at: new Date(),
      },
      {
        where: futureRecordsCondition,
      }
    );
  }

  return { success: true };
};

const recalculateAllConsultationDays = async () => {
  const customers = await CustomersBillingRecords.findAll({
    attributes: ["customer_id"],
  });

  for (const customer of customers) {
    await updateConsultationDays(customer.customer_id);
  }
};

module.exports = {
  updateConsultationDays,
  recalculateAllConsultationDays,
  updateConsultationFee,
};
