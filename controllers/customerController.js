const { Customer } = require('../models/customerModel');
const { User } = require('../models/userModel');

exports.createCustomer = async (req, res) => {
    try {
        console.log(req.body); 

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
            return res.status(400).json({ error: 'customer_name e customer_cpf_cnpj são obrigatórios.' });
        }

        const user = await User.create({
            user_name: customer_name,
            user_email: customer_email,
        });

        const validPatientStatus = patient_status === 'true' ? true : patient_status === 'false' ? false : null;

        const newCustomer = await Customer.create({
            user_id: user.google_user_id, 
            customer_name,
            customer_cpf_cnpj,
            customer_phone,
            customer_email,
            consultation_fee,
            patient_status: validPatientStatus,
            alternative_name,
            alternative_cpf_cpnj,
        });

        res.status(201).json(newCustomer);
    } catch (error) {
        console.error('Erro ao criar cliente:', error.message, error.stack);
        res.status(500).json({ error: 'Erro interno ao criar cliente.' });
    }
};


exports.getCustomers = async (req, res) => {
    try {
        const customers = await Customer.findAll();
        res.json(customers);
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        res.status(500).send('Erro interno do servidor.');
    }
};
