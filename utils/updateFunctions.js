const { format, parseISO } = require("date-fns");
const { Event, CustomersBillingRecords, Customer } = require("../models");
const { Op } = require("sequelize");

const updateConsultationDays = async (customerId) => {
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

  const consultationFee = await Customer.findOne({
    where: { customer_id: customerId },
    attributes: ["consultation_fee"],
  });

  for (const [monthYear, days] of Object.entries(daysByMonthYear)) {
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
        consultation_fee: consultationFee.consultation_fee || 0.0,
        deleted: existingRecord.deleted,
      });
    } else {
      await CustomersBillingRecords.create({
        customer_id: customerId,
        month_and_year: monthYear,
        consultation_days: days.join(", "),
        num_consultations: numConsultations,
        consultation_fee: consultationFee.consultation_fee || 0.0,
      });
    }
  }
};

const updateConsultationFee = async (customerId, newFee) => {
  const now = new Date();
  const currentMonthStr = now.toISOString().slice(0, 7);

  const billingRecords = await CustomersBillingRecords.findAll({
    where: {
      customer_id: customerId,
      month_and_year: { [Op.gte]: currentMonthStr },
    },
  });

  if (billingRecords.length === 0) return;

  const currentMonthRecord = billingRecords.find(
    (record) => record.month_and_year === currentMonthStr
  );

  if (!currentMonthRecord) {
    await CustomersBillingRecords.update(
      { consultation_fee: newFee },
      {
        where: {
          customer_id: customerId,
          month_and_year: { [Op.gt]: currentMonthStr },
        },
      }
    );
    return;
  }

  if (currentMonthRecord.consultation_fee === newFee) {
    await CustomersBillingRecords.update(
      { consultation_fee: newFee },
      {
        where: {
          customer_id: customerId,
          month_and_year: { [Op.gte]: currentMonthStr },
        },
      }
    );
  } else {
    await CustomersBillingRecords.update(
      { consultation_fee: newFee },
      {
        where: {
          customer_id: customerId,
          month_and_year: { [Op.gt]: currentMonthStr },
        },
      }
    );
  }
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
