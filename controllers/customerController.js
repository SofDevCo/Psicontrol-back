const { Customer, User, Event, CustomersBillingRecords } = require("../models");
const { formatDateIso, calculateAge } = require("../utils/dateUtils");

exports.upsertCustomer = async (userId, customerData) => {
  const {
    customer_id,
    customer_name,
    customer_cpf_cnpj,
    customer_phone,
    customer_email,
    consultation_fee,
    patient_status,
    alternative_name,
    alternative_cpf_cnpj,
    customer_dob,
  } = customerData;

  if (!customer_name || !customer_cpf_cnpj) {
    return res
      .status(400)
      .json({ error: "customer_name e customer_cpf_cnpj são obrigatórios." });
  }

  const validPatientStatus =
    patient_status === "true"
      ? true
      : patient_status === "false"
      ? false
      : null;

  const formattedCustomerDob = formatDateIso(customer_dob);

  if (customer_id) {
    const customer = await Customer.findOne({
      where: { customer_id, user_id: userId },
    });
    if (!customer) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    await customer.update({
      customer_name,
      customer_cpf_cnpj,
      customer_phone,
      customer_email,
      consultation_fee,
      patient_status: validPatientStatus,
      alternative_name,
      alternative_cpf_cnpj,
      customer_dob: formattedCustomerDob,
    });

    const age = calculateAge(formattedCustomerDob);
    return { customer, age };
  } else {
    const newCustomer = await Customer.create({
      user_id: userId,
      customer_name,
      customer_cpf_cnpj,
      customer_phone,
      customer_email,
      consultation_fee,
      patient_status: validPatientStatus,
      alternative_name,
      alternative_cpf_cnpj,
      customer_dob: formattedCustomerDob,
      archived: false,
    });

    await CustomersBillingRecords.create({
      customer_id: newCustomer.customer_id,
      consultation_fee: consultation_fee || 0.0,
    });

    const age = calculateAge(formattedCustomerDob);
    return { newCustomer, age };
  }
};

exports.createCustomer = async (req, res) => {
  const user = req.user;
  const newCustomer = await this.upsertCustomer(user.user_id, req.body);
  res.status(201).json(newCustomer);
};

exports.editCustomer = async (req, res) => {
  const user = req.user;
  const updateCustomer = await this.upsertCustomer(user.user_id, {
    customer_id: req.params.customerId,
    ...req.body,
  });
  res.status(200).json(updateCustomer);
};

exports.getCustomers = async (req, res) => {
  const userId = req.user.user_id;

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado." });
  }

  const customers = await Customer.findAll({
    where: { user_id: req.user.user_id, archived: false },
    include: [
      {
        model: CustomersBillingRecords,
        attributes: ["consultation_days"],
        required: false,
      },
    ],
  });

  const customersWithConsultationDays = customers.map((customer) => {
    const customerData = customer.toJSON();

    const consultationDays = customerData.CustomersBillingRecords
    && customerData.CustomersBillingRecords[0]?.consultation_days
    ? customerData.CustomersBillingRecords[0].consultation_days
        .split(", ")
        .map((day) => day.trim())
    : [];

    customerData.consultation_days = consultationDays.join(", ");
    customerData.num_consultations = consultationDays.length;

    const consultationFee = parseFloat(customerData.CustomersBillingRecords[0]?.consultation_fee || 0.01);
    customerData.total_consultation_fee = (consultationFee * customerData.num_consultations).toFixed(2);

    return customerData;
  });

  res.json(customersWithConsultationDays);
};

exports.getProfileCustomer = async (req, res) => {
  const { customerId } = req.params;
  const userId = req.user.user_id;

  const customer = await Customer.findOne({
    where: { customer_id: customerId, user_id: userId },
  });

  if (!customer) {
    return res.status(404).json({ error: "Cliente não encontrado." });
  }

  const age = calculateAge(customer.customer_dob);

  return res.status(200).json({ ...customer.toJSON(), age });
};

exports.deleteCustomer = async (req, res, next) => {
  const { customerId } = req.params;
  const userId = req.user.user_id;

  const customer = await Customer.findOne({
    where: { customer_id: customerId, user_id: userId },
  });

  if (!customer) {
    return res
      .status(404)
      .json({ error: "Cliente não encontrado ou não autorizado." });
  }

  await Customer.destroy({ where: { customer_id: customerId } });

  res.status(200).json({ message: "Cliente deletado com sucesso." });
};

exports.archiveCustomer = async (req, res) => {
  const { customerId } = req.params;
  const userId = req.user.user_id;
  const { archived } = req.body;

  const customer = await Customer.findOne({
    where: { customer_id: customerId, user_id: userId },
  });

  if (!customer) {
    return res.status(404).json({ error: "Cliente não encontrado." });
  }

  await Customer.update(
    { archived: archived },
    { where: { customer_id: customerId, user_id: userId } }
  );

  res.status(200).json({ message: "Cliente arquivado com sucesso." });
};

exports.getArchivedCustomers = async (req, res) => {
  const userId = req.user.user_id;

  const archivedCustomer = await Customer.findAll({
    where: { user_id: userId, archived: true },
  });

  if (archivedCustomer) {
    return res.status(200).json(archivedCustomer);
  }
  res.status(500).send("Erro ao buscar pacientes arquivados.");
};

exports.linkCustomerToEvent = async (req, res) => {
  const { eventId, customer_id } = req.body;
  const userId = req.user.user_id;

  const event = await Event.findOne({
    where: { customers_id: eventId, user_id: userId },
  });

  if (!event) {
    return res.status(404).json({ error: "Evento não encontrado." });
  }

  event.customer_id = customer_id;
  await event.save();

  res
    .status(200)
    .json({ message: "Paciente vinculado com sucesso ao evento!" });
};
