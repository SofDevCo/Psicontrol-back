const { Customer, User } = require("../models");

exports.createCustomer = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const {
      customer_name,
      customer_cpf_cnpj,
      customer_phone,
      customer_email,
      consultation_fee,
      patient_status,
      alternative_name,
      alternative_cpf_cnpj,
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
      alternative_cpf_cnpj,
    });

    res.status(201).json(newCustomer);
  } catch (error) {
    res.status(500).json({ error: "Erro interno ao criar cliente." });
  }
};

exports.getCustomers = async (req, res) => {
  try {
    const userId = req.user.user_id;

    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const customers = await Customer.findAll({
      where: { user_id: req.user.user_id },
    });

    res.json(customers);
  } catch (error) {
    res.status(500).send("Erro interno do servidor.");
  }
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
