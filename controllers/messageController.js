const { User, Customer, CustomersBillingRecords } = require("../models");
const Handlebars = require("handlebars");

exports.sendWhatsAppMessage = async (req, res) => {
  const userId = req.user.user_id;
  const { customer_id, selected_month } = req.body;

  if (!customer_id || !selected_month) {
    return res
      .status(400)
      .json({ error: "ID do cliente e mês são obrigatórios." });
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

  const billingRecords = await CustomersBillingRecords.findAll({
    where: {
      customer_id,
      month_and_year: selected_month,
    },
    attributes: [
      "consultation_days",
      "num_consultations",
      "total_consultation_fee",
      "sending_invoice",
    ],
  });

  if (!billingRecords || billingRecords.length === 0) {
    return res
      .status(404)
      .json({ error: "Nenhum registro encontrado para o mês selecionado." });
  }

  const consultationFee = parseFloat(customer.consultation_fee || 0);
  let consultationDays = [];
  let totalConsultations = 0;

  billingRecords.forEach((record) => {
    const days = record.consultation_days
      ? record.consultation_days.split(",").map((day) => day.trim())
      : [];
    totalConsultations += days.length;
    consultationDays = consultationDays.concat(days);
  });

  const totalConsultationFee = (totalConsultations * consultationFee).toFixed(
    2
  );
  const formattedDays =
    consultationDays.length === 1
      ? consultationDays[0]
      : `${consultationDays.slice(0, -1).join(", ")} e ${consultationDays.slice(
          -1
        )}`;
  const [year, month] = selected_month.split("-");
  const date = new Date(year, Number(month) - 1, 1);

  const dynamicData = {
    nome: customer.customer_name,
    mes: date.toLocaleString("pt-BR", { month: "long" }),
    dias: formattedDays,
    valor_total: totalConsultationFee.replace(".", ","),
    clinic_name: user.clinic_name || "Consultório",
    numero_de_consultas: totalConsultations,
  };

  const template = Handlebars.compile(user.user_message);
  const renderedMessage = template(dynamicData);

  const hasPhone = customer.customer_phone;
  const hasEmail = customer.customer_email;

  if (!hasPhone && !hasEmail) {
    return res.status(200).json({
      success: false,
      message: renderedMessage,
      showModal: false,
    });
  }

  if (!hasPhone) {
    return res.status(200).json({
      success: false,
      message: renderedMessage,
      showModal: true,
      whatsappLink: null,
    });
  }

  const formattedPhoneNumber = `55${customer.customer_phone.replace(
    /\D/g,
    ""
  )}`;
  const encodedMessage = encodeURIComponent(renderedMessage);
  const whatsappLink = `https://wa.me/${formattedPhoneNumber}?text=${encodedMessage}`;

  await CustomersBillingRecords.update(
    { sending_invoice: true },
    { where: { customer_id, month_and_year: selected_month } }
  );

  return res.status(200).json({
    success: true,
    user_message: renderedMessage,
    whatsappLink,
  });
};

exports.sendEmailMessage = async (req, res) => {
  const userId = req.user.user_id;
  const { customer_id, selected_month } = req.body;

  if (!customer_id || !selected_month) {
    return res
      .status(400)
      .json({ error: "ID do cliente e mês são obrigatórios." });
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

  const billingRecords = await CustomersBillingRecords.findAll({
    where: {
      customer_id,
      month_and_year: selected_month,
    },
    attributes: [
      "consultation_days",
      "num_consultations",
      "total_consultation_fee",
      "sending_invoice",
    ],
  });

  if (!billingRecords || billingRecords.length === 0) {
    return res
      .status(404)
      .json({ error: "Nenhum registro encontrado para o mês selecionado." });
  }

  const consultationFee = parseFloat(customer.consultation_fee || 0);
  let consultationDays = [];
  let totalConsultations = 0;

  billingRecords.forEach((record) => {
    const days = record.consultation_days
      ? record.consultation_days.split(",").map((day) => day.trim())
      : [];
    totalConsultations += days.length;
    consultationDays = consultationDays.concat(days);
  });

  const totalConsultationFee = (totalConsultations * consultationFee).toFixed(
    2
  );
  const formattedDays =
    consultationDays.length === 1
      ? consultationDays[0]
      : `${consultationDays.slice(0, -1).join(", ")} e ${consultationDays.slice(
          -1
        )}`;
  const [year, month] = selected_month.split("-");
  const date = new Date(year, Number(month) - 1, 1);

  const dynamicData = {
    nome: customer.customer_name,
    mes: date.toLocaleString("pt-BR", { month: "long" }),
    dias: formattedDays,
    valor_total: totalConsultationFee.replace(".", ","),
    clinic_name: user.clinic_name || "Consultório",
    numero_de_consultas: totalConsultations,
  };

  const template = Handlebars.compile(user.user_message);
  const renderedMessage = template(dynamicData);

  const customerEmail = customer.customer_email;
  if (!customerEmail) {
    return res.status(200).json({
      success: false,
      message: "E-mail não cadastrado.",
      showModal: true,
    });
  }

  const encodedMessage = encodeURIComponent(renderedMessage);
  const mailtoLink = `mailto:${customerEmail}?subject=Informações&body=${encodedMessage}`;

  await CustomersBillingRecords.update(
    { sending_invoice: true },
    { where: { customer_id, month_and_year: selected_month } }
  );

  res.status(200).json({
    success: true,
    user_message: renderedMessage,
    mailtoLink,
  });
};
