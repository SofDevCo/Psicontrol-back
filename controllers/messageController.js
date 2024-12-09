const { User, Customer, CustomersBillingRecords } = require("../models");
const Handlebars = require("handlebars");

exports.sendWhatsAppMessage = async (req, res) => {
  const userId = req.user.user_id;
  const { customer_id } = req.body;

  if (!customer_id) {
    return res.status(400).json({ error: "ID do cliente é obrigatório." });
  }

  const user = await User.findOne({ where: { user_id: userId } });
  if (!user || !user.user_message) {
    return res
      .status(404)
      .json({ error: "Mensagem não encontrada para o usuário." });
  }

  const customer = await Customer.findOne({ where: { customer_id } });
  if (!customer) {
    return res.status(404).json({ error: "Cliente não encontrado." });
  }

  const billingRecord = await CustomersBillingRecords.findOne({
    where: { customer_id },
    order: [["month_and_year", "DESC"]],
  });

  if (!billingRecord) {
    return res.status(404).json({
      error: "Registro de faturamento não encontrado para o cliente.",
    });
  }

  const consultationFee = parseFloat(customer.consultation_fee || 0);
  const consultationDays = billingRecord.consultation_days
    ? billingRecord.consultation_days.split(",").map((day) => day.trim())
    : [];
  const numConsultations = consultationDays.length;
  const totalConsultationFee = (numConsultations * consultationFee).toFixed(2);

  const formattedDays =
    consultationDays.length === 1
      ? consultationDays[0]
      : `${consultationDays.slice(0, -1).join(", ")} e ${consultationDays.slice(
          -1
        )}`;
        

  const dynamicData = {
    nome: customer.customer_name,
    mes:(billingRecord.month_and_year).toLocaleString("pt-BR", {
      month: "long",
    }),
    dias: formattedDays,
    valor_total: totalConsultationFee.replace(".", ","),
    clinic_name: user.clinic_name || "Consultório",
  };

  const messageTemplate = user.user_message;
  const template = Handlebars.compile(messageTemplate);
  const renderedMessage = template(dynamicData);

  const formattedPhoneNumber = customer.customer_phone.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(renderedMessage);
  const whatsappLink = `https://wa.me/${formattedPhoneNumber}?text=${encodedMessage}`;

  res.status(200).json({
    user_message: renderedMessage,
    whatsappLink,
  });
};

exports.sendEmailMessage = async (req, res) => {
  const userId = req.user.user_id;
  const { customer_id } = req.body;

  if (!customer_id) {
    return res.status(400).json({ error: "ID do cliente é obrigatório." });
  }

  const user = await User.findOne({ where: { user_id: userId } });
  if (!user || !user.user_message) {
    return res
      .status(404)
      .json({ error: "Mensagem não encontrada para o usuário." });
  }

  const customer = await Customer.findOne({ where: { customer_id } });
  if (!customer || !customer.customer_email) {
    return res.status(404).json({ error: "Email do cliente não encontrado." });
  }

  const billingRecord = await CustomersBillingRecords.findOne({
    where: { customer_id },
    order: [["month_and_year", "DESC"]],
  });

  if (!billingRecord) {
    return res.status(404).json({
      error: "Registro de faturamento não encontrado para o cliente.",
    });
  }

  let consultationDays = billingRecord.consultation_days;
  if (consultationDays) {
    try {
      consultationDays = JSON.parse(consultationDays);
    } catch {
      consultationDays = consultationDays.split(",").map((day) => day.trim());
    }
  }

  const formattedDays =
    consultationDays.length === 1
      ? consultationDays[0]
      : `${consultationDays.slice(0, -1).join(", ")} e ${consultationDays.slice(
          -1
        )}`;

  const dynamicData = {
    nome: customer.customer_name,
    mes: new Date(billingRecord.month_and_year).toLocaleString("pt-BR", {
      month: "long",
    }),
    dias: formattedDays,
    valor_total: parseFloat(billingRecord.total_consultation_fee || 0)
      .toFixed(2)
      .replace(".", ","),
    clinic_name: user.clinic_name || "Consultório",
  };

  const messageTemplate = user.user_message;
  const template = Handlebars.compile(messageTemplate);
  const renderedMessage = template(dynamicData);

  const customerEmail = customer.customer_email;
  const encodedMessage = encodeURIComponent(renderedMessage);
  const mailtoLink = `mailto:${customerEmail}?subject=Informações&body=${encodedMessage}`;

  res.status(200).json({
    user_message: renderedMessage,
    mailtoLink,
  });
};
