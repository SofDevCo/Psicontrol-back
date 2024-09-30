const { Customer, User } = require("../models");

exports.createCustomer = async (req, res) => {
  try {
    const user = req.user;
    console.log("User ID em createCustomer:", user);

    if (!user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    console.log("error: ");
    const {
      customer_name,
      customer_cpf_cnpj,
      customer_phone,
      customer_email,
      consultation_fee,
      patient_status,
      alternative_name,
      alternative_cpf_cpnj,
    } = req.body;

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

    const newCustomer = await Customer.create({
      user_id: user.user_id,
      customer_name,
      customer_cpf_cnpj,
      customer_phone,
      customer_email,
      consultation_fee,
      patient_status: validPatientStatus,
      alternative_name,
      alternative_cpf_cpnj,
    });

    console.log("campos: ", newCustomer);
    res.status(201).json(newCustomer);
  } catch (error) {
    console.error("Erro ao criar cliente:", error.message, error.stack);
    res.status(500).json({ error: "Erro interno ao criar cliente." });
  }
};

exports.getCustomers = async (req, res) => {
  try {
    const userId = req.user.user_id;
    console.log("User ID em getCustomers:", userId);

    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const customers = await Customer.findAll({
      where: { user_id: req.user.user_id},
    });

    res.json(customers);
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    res.status(500).send("Erro interno do servidor.");
  }
};
