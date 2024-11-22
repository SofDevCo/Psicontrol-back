const { zonedTimeToUtc, formatInTimeZone } = require("date-fns-tz");
const { getDate, parseISO, format } = require("date-fns");
const { Event, CustomersBillingRecords } = require("../models");

const CLIENT_TIMEZONE = "America/Sao_Paulo";

const updateConsultationDays = async (customerId) => {
  const events = await Event.findAll({
    where: { customer_id: customerId },
    attributes: ["date"],
  });

  if (events.length === 0) {
    return;
  }

  const days = [
    ...new Set(
      events.map((event) => {
        console.log("Processando evento:", event.date);

        const day = getDate(parseISO(event.date));
        console.log("Dia extraído:", day);

        return day;
      })
    ),
  ]
    .sort((a, b) => a - b)
    .join(", ");

  await CustomersBillingRecords.update(
    { consultation_days: days },
    { where: { customer_id: customerId } }
  );
};

const recalculateAllConsultationDays = async () => {
  const customers = await CustomersBillingRecords.findAll({ attributes: ["customer_id"] });

  for (const customer of customers) {
    await updateConsultationDays(customer.customer_id);
  }
};

module.exports = { updateConsultationDays, recalculateAllConsultationDays };
