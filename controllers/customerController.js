const { Customer, Event, CustomersBillingRecords } = require("../models");
const {
  updateConsultationDays,
  updateConsultationFee,
} = require("../utils/updateFunctions");
const {
  formatDateIso,
  calculateAge,
  formatDate,
} = require("../utils/dateUtils");
const {
  validateCPFOrCNPJ,
  validatePhoneNumber,
  validateEmail,
} = require("../utils/Validators");
const { parseISO, isAfter: dateFnsIsAfter, format } = require("date-fns");
const { Op } = require("sequelize");
const { cancelEventByGoogleId } = require("../services/eventService");

exports.upsertCustomer = async (userId, customerData) => {
  const {
    customer_id,
    customer_name,
    customer_second_name,
    customer_calendar_name,
    customer_cpf_cnpj,
    customer_phone,
    customer_email,
    consultation_fee,
    patient_status,
    alternative_name,
    alternative_cpf_cnpj,
    customer_dob,
    customer_emergency_name,
    customer_emergency_relationship,
    customer_emergency_contact,
  } = customerData;

  if (!customer_name) {
    return { error: true, status: 400, message: "customer_name" };
  }

  if (customer_cpf_cnpj && !validateCPFOrCNPJ(customer_cpf_cnpj)) {
    return { error: true, status: 400, message: "CPF/CNPJ inválido" };
  }

  if (alternative_cpf_cnpj && !validateCPFOrCNPJ(alternative_cpf_cnpj)) {
    return {
      error: true,
      status: 400,
      message: "CPF/CNPJ alternativo inválido",
    };
  }

  if (customer_email) {
    const emailValidation = validateEmail(customer_email);
    if (!emailValidation.isValid) {
      return { error: true, status: 400, message: emailValidation.message };
    }
  }

  const formattedCustomerPhone = customer_phone
    ? (() => {
        const validation = validatePhoneNumber(customer_phone);
        if (!validation.isValid) {
          return { error: true, status: 400, message: validation.message };
        }
        return validation.formatted;
      })()
    : null;

  const formattedEmergencyContact = customer_emergency_contact
    ? (() => {
        const validation = validatePhoneNumber(customer_emergency_contact);
        if (!validation.isValid) {
          return { error: true, status: 400, message: validation.message };
        }
        return validation.formatted;
      })()
    : null;

  const validPatientStatus =
    patient_status === "true"
      ? true
      : patient_status === "false"
      ? false
      : null;

  const formattedCustomerDob = customer_dob
    ? formatDateIso(customer_dob)
    : null;

  if (customer_dob && !formattedCustomerDob) {
    return {
      error: true,
      status: 400,
      message: "Data de nascimento inválida.",
    };
  }

  if (customer_id) {
    const customer = await Customer.findOne({
      where: { customer_id, user_id: userId },
    });
    if (!customer) {
      return { error: true, status: 401, message: "Usuário não autenticado." };
    }

    await customer.update({
      customer_name,
      customer_second_name,
      customer_calendar_name,
      customer_cpf_cnpj,
      customer_phone: formattedCustomerPhone,
      customer_email,
      consultation_fee,
      patient_status: validPatientStatus,
      alternative_name,
      alternative_cpf_cnpj,
      customer_emergency_name,
      customer_emergency_relationship,
      customer_emergency_contact: formattedEmergencyContact,
      customer_dob: formattedCustomerDob,
    });

    await updateConsultationFee(
      customer.customer_id,
      parseFloat(consultation_fee) || 0.0,
      customerData.update_from
    );

    if (
      customerData.update_from === "current_month" ||
      customerData.update_from === "current"
    ) {
      const currentMonthYear = formatDate(new Date());
      const billingRecord = await CustomersBillingRecords.findOne({
        where: {
          customer_id: customer.customer_id,
          month_and_year: currentMonthYear,
        },
      });

      if (billingRecord) {
        await billingRecord.update({
          consultation_fee: parseFloat(consultation_fee) || 0.0,
        });
      } else {
        await CustomersBillingRecords.create({
          customer_id: customer.customer_id,
          month_and_year: currentMonthYear,
          consultation_fee: parseFloat(consultation_fee) || 0.0,
        });
      }
    }

    const age = calculateAge(formattedCustomerDob);
    return { customer: customer.toJSON(), age };
  } else {
    const newCustomer = await Customer.create({
      user_id: userId,
      customer_name,
      customer_second_name,
      customer_calendar_name,
      customer_cpf_cnpj,
      customer_phone: formattedCustomerPhone,
      customer_email,
      patient_status: validPatientStatus,
      alternative_name,
      alternative_cpf_cnpj,
      customer_dob: formattedCustomerDob,
      archived: false,
      deleted: false,
      consultation_fee,
      customer_emergency_name,
      customer_emergency_relationship,
      customer_emergency_contact: formattedEmergencyContact,
    });

    const age = calculateAge(formattedCustomerDob);
    return { newCustomer: newCustomer.toJSON(), age };
  }
};

exports.createCustomer = async (req, res) => {
  const user = req.user;
  const newCustomer = await this.upsertCustomer(user.user_id, req.body);

  if (newCustomer.error) {
    return res.status(newCustomer.status).json({ error: newCustomer.message });
  }

  res.status(201).json(newCustomer);
};

exports.editCustomer = async (req, res) => {
  const user = req.user;
  const updateCustomer = await this.upsertCustomer(user.user_id, {
    customer_id: req.params.customerId,
    ...req.body,
  });

  if (updateCustomer.error) {
    return res
      .status(updateCustomer.status)
      .json({ error: updateCustomer.message });
  }

  res.status(200).json(updateCustomer);
};

exports.getCustomers = async (req, res) => {
  const userId = req.user.user_id;

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado." });
  }

  const customers = await Customer.findAll({
    where: { user_id: req.user.user_id, archived: false, deleted: false },
    include: [
      {
        model: CustomersBillingRecords,
        attributes: ["consultation_days", "consultation_fee"],
        required: false,
      },
    ],
  });

  let totalConsultations = 0;
  let totalRevenue = 0;

  const customersWithConsultationDays = customers.map((customer) => {
    const customerData = customer.toJSON();

    const consultationDays =
      customerData.CustomersBillingRecords &&
      customerData.CustomersBillingRecords[0]?.consultation_days
        ? customerData.CustomersBillingRecords[0].consultation_days
            .split(", ")
            .map((day) => day.trim())
        : [];

    customerData.consultation_days = consultationDays.join(", ");
    customerData.num_consultations = consultationDays.length;

    const consultationFee = customerData.CustomersBillingRecords[0]
      ?.consultation_fee
      ? parseFloat(customerData.CustomersBillingRecords[0].consultation_fee)
      : 0;
    customerData.total_consultation_fee = (
      consultationFee * customerData.num_consultations
    ).toFixed(2);

    totalConsultations += customerData.num_consultations;
    totalRevenue += parseFloat(customerData.total_consultation_fee);

    return customerData;
  });

  res.json({
    customers: customersWithConsultationDays,
    totalConsultations,
    totalRevenue: parseFloat(totalRevenue).toFixed(2),
  });
};

exports.getProfileCustomer = async (req, res) => {
  const { customerId } = req.params;
  const userId = req.user.user_id;

  const customer = await Customer.findOne({
    where: { customer_id: customerId, user_id: userId },
    attributes: [
      "customer_id",
      "customer_name",
      "consultation_fee",
      "customer_second_name",
      "customer_cpf_cnpj",
      "alternative_cpf_cnpj",
      "customer_calendar_name",
      "customer_email",
      "customer_dob",
      "customer_phone",
      "customer_personal_message",
      "customer_dob",
    ],
    include: [
      {
        model: CustomersBillingRecords,
        attributes: [
          "consultation_days",
          "consultation_fee",
          "month_and_year",
          "sending_invoice",
          "payment_status",
          "bill_of_sale",
          "payment_amount",
        ],
      },
    ],
  });

  if (!customer) {
    return res.status(404).json({ error: "Cliente não encontrado." });
  }

  const age = calculateAge(customer.customer_dob);

  const customerData = customer.toJSON();
  customerData.customer_personal_message =
    customerData.customer_personal_message
      ? customerData.customer_personal_message
          .split("\n")
          .filter((line) => line.trim() !== "")
      : [];

  const groupedBilling = {};

  customerData.CustomersBillingRecords.forEach((record) => {
    const { month_and_year, consultation_days, consultation_fee } = record;

    if (!groupedBilling[month_and_year]) {
      groupedBilling[month_and_year] = {
        month: month_and_year,
        num_consultations: 0,
        total_consultation_fee: 0,
        consultation_fee: parseFloat(consultation_fee || 0),
        consultation_days: [],
      };
    }

    const daysArray = consultation_days
      ? consultation_days.split(",").map((day) => day.trim(), 10)
      : [];
    const numConsultations = daysArray.length;
    const consultationFee = parseFloat(consultation_fee || 0);

    groupedBilling[month_and_year].num_consultations += numConsultations;
    groupedBilling[month_and_year].total_consultation_fee +=
      numConsultations * consultationFee;
    groupedBilling[month_and_year].consultation_days = [
      ...groupedBilling[month_and_year].consultation_days,
      ...daysArray,
    ];
  });

  const formatedBilling = Object.values(groupedBilling).map((item) => {
    const matchingRecord = customerData.CustomersBillingRecords.find(
      (record) => record.month_and_year === item.month
    );

    return {
      ...item,
      customer_id: customer.customer_id,
      consultation_days: item.consultation_days
        .sort((a, b) => a - b)
        .join(", "),
      consultation_fee: item.consultation_fee || 0,
      total_consultation_fee: item.total_consultation_fee.toFixed(2),
      sending_invoice: matchingRecord?.sending_invoice || false,
      payment_status: matchingRecord?.payment_status || "pendente",
      bill_of_sale: matchingRecord?.bill_of_sale || false,
      payment_amount: parseFloat(matchingRecord?.payment_amount || 0),
    };
  });

  return res
    .status(200)
    .json({ ...customerData, age, billingRecords: formatedBilling });
};

exports.updateCustomerMessage = async (req, res) => {
  const { customerId } = req.params;
  const userId = req.user.user_id;
  const { customer_personal_message } = req.body;

  const customer = await Customer.findOne({
    where: { customer_id: customerId, user_id: userId },
  });

  if (!customer) {
    return res.status(404).json({ error: "Cliente não encontrado." });
  }

  const formattedMessage = Array.isArray(customer_personal_message)
    ? customer_personal_message.join("\n")
    : customer_personal_message;

  await customer.update({ customer_personal_message: formattedMessage });

  const updatedCustomer = await Customer.findOne({
    where: { customer_id: customerId, user_id: userId },
    attributes: ["customer_personal_message"],
  });

  const responseMessage = updatedCustomer.customer_personal_message
    ? updatedCustomer.customer_personal_message
        .split("\n")
        .filter((line) => line.trim() !== "")
    : [];

  return res.status(200).json({ customer_personal_message: responseMessage });
};

exports.deleteCustomer = async (req, res) => {
  const { customerId } = req.params;
  const userId = req.user.user_id;
  const { deleted } = req.body;

  const customer = await Customer.findOne({
    where: { customer_id: customerId, user_id: userId },
  });
  if (!customer) {
    return res
      .status(404)
      .json({ error: "Cliente não encontrado ou não autorizado." });
  }

  const deletionDate = new Date();

  const [updated] = await Customer.update(
    { deleted: deleted },
    { where: { customer_id: customerId, user_id: userId } }
  );

  if (!updated) {
    return res.status(500).json({ error: "Erro ao deletar o cliente." });
  }

  const events = await Event.findAll({
    where: { customer_id: customerId, status: { [Op.notIn]: ["cancelado"] } },
    attributes: ["date", "google_event_id"],
  });

  for (const event of events) {
    const eventDate = parseISO(event.date);
    if (dateFnsIsAfter(eventDate, deletionDate)) {
      if (event.google_event_id) {
        await cancelEventByGoogleId(event.google_event_id);
      }
    }
  }

  const deletionMonthYear = format(deletionDate, "yyyy-MM");

  await CustomersBillingRecords.update(
    { deleted: true },
    {
      where: {
        customer_id: customerId,
        month_and_year: { [Op.gt]: deletionMonthYear },
      },
    }
  );

  const currentRecord = await CustomersBillingRecords.findOne({
    where: { customer_id: customerId, month_and_year: deletionMonthYear },
  });
  if (currentRecord && currentRecord.consultation_days) {
    const deletionDay = parseInt(format(deletionDate, "dd"), 10);
    const daysArray = currentRecord.consultation_days
      .split(",")
      .map((day) => day.trim())
      .filter((day) => parseInt(day, 10) <= deletionDay);

    await currentRecord.update({
      consultation_days: daysArray.join(", "),
      num_consultations: daysArray.length,
    });
  }

  await updateConsultationDays(customerId);

  return res.status(200).json({ message: "Cliente deletado com sucesso." });
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

  const archiveDate = new Date();

  const [archive] = await Customer.update(
    { archived: archived },
    { where: { customer_id: customerId, user_id: userId } }
  );

  if (!archive) {
    res.status(200).json({ message: "Cliente arquivado com sucesso." });
  }

  const events = await Event.findAll({
    where: { customer_id: customerId, status: { [Op.notIn]: ["cancelado"] } },
    attributes: ["date", "google_event_id"],
  });

  for (const event of events) {
    const eventDate = parseISO(event.date);
    if (dateFnsIsAfter(eventDate, archiveDate)) {
      if (event.google_event_id) {
        await cancelEventByGoogleId(event.google_event_id);
      }
    }
  }

  const archivedMonthYear = format(archiveDate, "yyyy-MM");

  await CustomersBillingRecords.update(
    { archived: true },
    {
      where: {
        customer_id: customerId,
        month_and_year: { [Op.gt]: archivedMonthYear },
      },
    }
  );

  const currentRecord = await CustomersBillingRecords.findOne({
    where: { customer_id: customerId, month_and_year: archivedMonthYear },
  });
  if (currentRecord && currentRecord.consultation_days) {
    const archiveDay = parseInt(format(archiveDate, "dd"), 10);
    const daysArray = currentRecord.consultation_days
      .split(",")
      .map((day) => day.trim())
      .filter((day) => parseInt(day, 10) <= archiveDay);

    await currentRecord.update({
      consultation_days: daysArray.join(", "),
      num_consultations: daysArray.length,
    });
  }

  await updateConsultationDays(customerId);

  return res.status(200).json({ message: "Cliente deletado com sucesso." });
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
    where: { google_event_id: eventId, user_id: userId },
  });

  if (!event) {
    return res.status(404).json({ error: "Evento não encontrado." });
  }

  await Event.update(
    { customer_id },
    {
      where: {
        event_name: event.event_name,
        user_id: userId,
        customer_id: null,
      },
    }
  );
  const patient = await Customer.findOne({
    where: { customer_id, user_id: userId },
  });

  if (patient) {
    await updateConsultationDays(patient.customer_id);
  }
  res
    .status(200)
    .json({ message: "Paciente vinculado com sucesso ao evento!" });
};
