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

  for (const [monthYear, days] of Object.entries(daysByMonthYear)) {
    const applicableFeeRecord = billingRecords.find(
      (record) => record.month_and_year <= monthYear
    );

    const consultationFee = applicableFeeRecord?.consultation_fee || 0.0;

    const numConsultations = days.length;

    const existingRecord = await CustomersBillingRecords.findOne({
      where: { customer_id: customerId, month_and_year: monthYear },
    });

    if (existingRecord && existingRecord.deleted) {
      continue;
    }

    if (existingRecord) {
      await existingRecord.update({
        consultation_days: days.join(", "),
        num_consultations: numConsultations,
        deleted: existingRecord.deleted,
      });
    } else {
      await CustomersBillingRecords.create({
        customer_id: customerId,
        month_and_year: monthYear,
        consultation_days: days.join(", "),
        num_consultations: numConsultations,
        consultation_fee: consultationFee,
        fee_updated_at: new Date(),
      });
    }
  }
};

const updateConsultationFee = async (customerId, newFee, updateFrom) => {
  const now = new Date();
  let targetMonthYear;

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  if (updateFrom === "current_month") {
    targetMonthYear = formatDate(now);
  } else {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    targetMonthYear = formatDate(nextMonth);
  }

  const existingRecord = await CustomersBillingRecords.findOne({
    where: {
      customer_id: customerId,
      month_and_year: targetMonthYear,
    },
  });

  if (existingRecord) {
    await existingRecord.update({
      consultation_fee: newFee,
      fee_updated_at: new Date(),
    });
  } else {
    await CustomersBillingRecords.create({
      customer_id: customerId,
      month_and_year: targetMonthYear,
      consultation_fee: newFee,
      fee_updated_at: new Date(),
    });
  }

  const operator = updateFrom === "current_month" ? Op.gte : Op.gt;

  await CustomersBillingRecords.update(
    { consultation_fee: newFee },
    {
      where: {
        customer_id: customerId,
        month_and_year: { [operator]: targetMonthYear },
        fee_updated_at: null,
      },
    }
  );
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
