const {
  Customer,
  Event,
  CustomersBillingRecords,
  Calendar,
} = require("../models");
const Fuse = require("fuse.js");
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
const {
  parseISO,
  isAfter: dateFnsIsAfter,
  format,
  addMonths,
} = require("date-fns");
const { Op } = require("sequelize");
const { cancelEventByGoogleId } = require("../services/eventService");
const {
  fetchGoogleCalendarEvents,
  fetchGoogleCalendars,
} = require("./authController");

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
    ? validatePhoneNumber(customer_phone, "BR", "53")
    : null;

  if (formattedCustomerPhone === null && customer_phone) {
    return {
      error: true,
      status: 400,
      message: "Número de telefone inválido.",
    };
  }

  const formattedEmergencyContact = customer_emergency_contact
    ? validatePhoneNumber(customer_emergency_contact, "BR", "53")
    : null;

  if (formattedEmergencyContact === null && customer_emergency_contact) {
    return {
      error: true,
      status: 400,
      message: "Número de telefone de emergência inválido.",
    };
  }

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

  const formattedConsultationFee =
    consultation_fee === "" ||
    consultation_fee === undefined ||
    consultation_fee === null
      ? 0.0
      : parseFloat(consultation_fee);

  if (customer_id) {
    const customer = await Customer.findOne({
      where: { customer_id, user_id: userId },
    });
    if (!customer) {
      return { error: true, status: 401, message: "Usuário não autenticado." };
    }

    const previousConsultationFee = customer.consultation_fee;
    const newConsultationFee = parseFloat(consultation_fee) || 0.0;

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

    if (
      parseFloat(previousConsultationFee) !== newConsultationFee &&
      consultation_fee !== undefined
    ) {
      const updateResult = await updateConsultationFee(
        customer.customer_id,
        newConsultationFee,
        customerData.update_from
      );

      if (updateResult.error) {
        return updateResult;
      }
    }

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
      consultation_fee: formattedConsultationFee,
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

  const { newCustomer: createdCustomer } = newCustomer;
  const accessToken = user.access_token;

  const calendars = await fetchGoogleCalendars(accessToken);
  if (calendars.length === 0) {
    return res.status(400).json({ error: "Nenhum calendário encontrado." });
  }
  const calendarId = calendars[0].id;
  await fetchGoogleCalendarEvents(accessToken, calendarId);

  const unmatchedEvents = await Event.findAll({
    where: { customer_id: null, user_id: user.user_id },
  });

  const cleanCustomerName = createdCustomer.customer_calendar_name
    .replace(/^Paciente - /i, "")
    .trim()
    .toLowerCase();

  const cleanUnmatchedEvents = unmatchedEvents.map((event) => ({
    ...event,
    event_name: event.event_name.replace(/^Paciente - /i, "").trim(),
  }));

  let matchedEvents = cleanUnmatchedEvents.filter(
    (e) => e.event_name.toLowerCase() === cleanCustomerName
  );
  if (matchedEvents.length === 0) {
    const fuse = new Fuse(cleanUnmatchedEvents, {
      keys: ["event_name"],
      threshold: 0.2,
      distance: 100,
      includeScore: true,
      findAllMatches: true,
    });
    const result = fuse.search(cleanCustomerName);
    const fuzzyMatches = result.filter((r) => r.score < 0.1).map((r) => r.item);
    matchedEvents.push(...fuzzyMatches);
  }

  const eventIds = matchedEvents
    .map((e) => e.dataValues?.google_event_id)
    .filter((id) => id);

  if (eventIds.length > 0) {
    await Event.update(
      { customer_id: createdCustomer.customer_id },
      {
        where: {
          user_id: user.user_id,
          google_event_id: { [Op.in]: eventIds },
        },
      }
    );
  }

  await updateConsultationDays(createdCustomer.customer_id);

  const billingRecords = await CustomersBillingRecords.findAll({
    where: { customer_id: createdCustomer.customer_id },
    attributes: [
      "id",
      "month_and_year",
      "consultation_days",
      "consultation_fee",
    ],
  });

  for (const billingRecord of billingRecords) {
    const daysCount = billingRecord.consultation_days
      ? billingRecord.consultation_days
          .split(",")
          .map((d) => d.trim())
          .filter((d) => d).length
      : 0;

    const unitFee = parseFloat(billingRecord.consultation_fee) || 0;
    const totalFee = (daysCount * unitFee).toFixed(2);

    await billingRecord.update({ total_consultation_fee: totalFee });
  }

  return res.status(201).json(newCustomer);
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

  const updatedCustomer = updateCustomer.customer;
  const accessToken = user.access_token;

  const calendars = await fetchGoogleCalendars(accessToken);
  if (calendars.length === 0) {
    return res.status(200).json(updateCustomer);
  }

  const calendarId = calendars[0].id;
  const events = await fetchGoogleCalendarEvents(accessToken, calendarId);

  const unmatchedEvents = await Event.findAll({
    where: { customer_id: null, user_id: user.user_id },
  });

  const cleanCustomerName = updatedCustomer.customer_calendar_name
    .replace(/^Paciente - /i, "")
    .trim()
    .toLowerCase();

  const cleanUnmatchedEvents = unmatchedEvents.map((event) => ({
    ...event,
    event_name: event.event_name.replace(/^Paciente - /i, "").trim(),
  }));

  let matchedEvents = cleanUnmatchedEvents.filter(
    (e) => e.event_name.toLowerCase() === cleanCustomerName
  );

  if (matchedEvents.length === 0) {
    const fuse = new Fuse(cleanUnmatchedEvents, {
      keys: ["event_name"],
      threshold: 0.2,
      distance: 100,
      includeScore: true,
      findAllMatches: true,
    });

    const result = fuse.search(cleanCustomerName);
    const fuzzyMatches = result.filter((r) => r.score < 0.1).map((r) => r.item);

    matchedEvents.push(...fuzzyMatches);
  }

  const eventIds = matchedEvents
    .map((e) => e.dataValues?.google_event_id)
    .filter((id) => id);

  if (eventIds.length > 0) {
    await Event.update(
      { customer_id: updatedCustomer.customer_id },
      {
        where: {
          google_event_id: { [Op.in]: eventIds },
          user_id: user.user_id,
        },
      }
    );

    await updateConsultationDays(updatedCustomer.customer_id);
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
    ],
    include: [
      {
        model: CustomersBillingRecords,
        attributes: [
          "consultation_days",
          "consultation_fee",
          "total_consultation_fee",
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

  const customerData = customer.toJSON();
  const age = calculateAge(customerData.customer_dob);

  customerData.customer_personal_message =
    customerData.customer_personal_message
      ? customerData.customer_personal_message
          .split("\n")
          .filter((line) => line.trim() !== "")
      : [];

  if (!Array.isArray(customerData.CustomersBillingRecords)) {
    return res.status(200).json({ ...customerData, age, billingRecords: [] });
  }

  const activeEvents = await Event.findAll({
    where: {
      customer_id: customerData.customer_id,
      status: { [Op.not]: "cancelado" },
    },
    attributes: ["date"],
  });
  const activeDays = new Set(
    activeEvents.map((event) => event.date.split("-")[2])
  );

  const groupedBilling = {};

  customerData.CustomersBillingRecords.forEach((record) => {
    const {
      month_and_year,
      consultation_days,
      consultation_fee,
      total_consultation_fee,
    } = record;

    if (!groupedBilling[month_and_year]) {
      groupedBilling[month_and_year] = {
        month: month_and_year,
        num_consultations: 0,
        total_consultation_fee: parseFloat(total_consultation_fee || 0),
        consultation_fee: parseFloat(consultation_fee || 0),
        consultation_days: [],
      };
    }

    const filteredDays = consultation_days
      ? consultation_days
          .split(",")
          .map((day) => day.trim())
          .filter((day) => activeDays.has(day))
      : [];

    groupedBilling[month_and_year].num_consultations += filteredDays.length;
    groupedBilling[month_and_year].consultation_days.push(...filteredDays);
  });

  const formatedBilling = Object.values(groupedBilling).map((item) => {
    const matchingRecord = customerData.CustomersBillingRecords.find(
      (record) => record.month_and_year === item.month
    );

    return {
      ...item,
      customer_id: customerData.customer_id,
      consultation_days: item.consultation_days
        .sort((a, b) => a - b)
        .join(", "),
      consultation_fee: item.consultation_fee,
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
  const userId = req.user?.user_id;
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
  const deletionMonthYear = format(deletionDate, "yyyy-MM");

  const [updated] = await Customer.update(
    { deleted: deleted },
    { where: { customer_id: customerId, user_id: userId } }
  );

  if (!updated) {
    return res.status(500).json({ error: "Erro ao deletar o cliente." });
  }

  const events = await Event.findAll({
    where: {
      customer_id: customerId,
      user_id: userId,
      status: { [Op.notIn]: ["cancelado"] },
    },
    attributes: ["customers_id", "date", "google_event_id"],
  });

  for (const event of events) {
    const eventDate = parseISO(event.date);

    if (dateFnsIsAfter(eventDate, deletionDate)) {
      if (event.google_event_id) {
        await cancelEventByGoogleId(event.google_event_id, userId);
      }
      if (event.customers_id) {
        await event.update({ status: "cancelado" });
        console.error("Evento sem identificador válido:", event);
      }
    }
  }

  const nextMonthYear = format(addMonths(deletionDate, 1), "yyyy-MM");
  const currentMonthYear = format(new Date(), "yyyy-MM");

  if (nextMonthYear !== currentMonthYear) {
    const isCustomerDeletedForUser = await Customer.findOne({
      where: { customer_id: customerId, user_id: userId, deleted: true },
    });

    if (isCustomerDeletedForUser) {
      await CustomersBillingRecords.update(
        { deleted: true },
        {
          where: {
            customer_id: customerId,
            month_and_year: { [Op.gte]: nextMonthYear },
          },
        }
      );
    }
  }

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
        await cancelEventByGoogleId(event.google_event_id, userId);
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

    const billingRecords = await CustomersBillingRecords.findAll({
      where: { customer_id: patient.customer_id },
      attributes: ["id", "consultation_days", "consultation_fee"],
    });

    for (const record of billingRecords) {
      const daysCount = record.consultation_days
        ? record.consultation_days
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean).length
        : 0;
      const unitFee = parseFloat(record.consultation_fee) || 0;
      const totalFee = (daysCount * unitFee).toFixed(2);

      await record.update({ total_consultation_fee: totalFee });
    }
  }

  return res
    .status(200)
    .json({ message: "Paciente vinculado com sucesso ao evento!" });
};
