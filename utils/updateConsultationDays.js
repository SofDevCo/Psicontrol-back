const {Event, CustomersBillingRecords} = require("../models");

const updateConsultationDays = async (customerId) => {
    const events = await Event.findAll({
      where: { customer_id: customerId },
      attributes: ["date"],
    });
  
    const days = [...new Set(events.map(event => new Date(event.date).getDate()))]
      .sort((a, b) => a - b)
      .join(", ");
  
    await CustomersBillingRecords.update(
      { consultation_days: days },
      { where: { customer_id: customerId } }
    );
  };
  
  module.exports = { updateConsultationDays };  