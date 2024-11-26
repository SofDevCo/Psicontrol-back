const { zonedTimeToUtc, formatInTimeZone } = require("date-fns-tz");
const { getDate, parseISO, format } = require("date-fns");
const { Event, CustomersBillingRecords } = require("../models");

const CLIENT_TIMEZONE = "America/Sao_Paulo";

const updateConsultationDays = async (customerId) => {
  const events = await Event.findAll({
    where: { customer_id: customerId },
    attributes: ["date"],
  });

  const daysByMonthYear = events.reduce((acc, event) => {
    const [year, month] = event.date.split("-");
    const monthYear = `${year}-${month}`;
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(event.date);
    return acc;
  }, {});

  for (const [monthYear, days] of Object.entries(daysByMonthYear)) {
    const numConsultations = days.length;

    const existingRecord = await CustomersBillingRecords.findOne({
      where: { customer_id: customerId, month_and_year: monthYear },
    });

    if (existingRecord) {
      await existingRecord.update({
        consultation_days: days.join(", "),
        num_consultations: numConsultations,
      });
    } else {
      await CustomersBillingRecords.create({
        customer_id: customerId,
        month_and_year: monthYear,
        consultation_days: days.join(", "),
        num_consultations: numConsultations,
      });
    }
  }
};

const recalculateAllConsultationDays = async () => {
  const customers = await CustomersBillingRecords.findAll({ attributes: ["customer_id"] });

  for (const customer of customers) {
    await updateConsultationDays(customer.customer_id);
  }
};

module.exports = { updateConsultationDays, recalculateAllConsultationDays };
