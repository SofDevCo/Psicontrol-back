const { Customer } = require('../models/customerModel');
const { User } = require('../models/userModel');

exports.createCustomer = async (req, res) => {
    try {
        console.log(req.body); // Log para verificar o conteúdo do req.body

        const {
            customer_name,
            customer_cpf,
            customer_cnpj,
            customer_phone,
            customer_email,
            consultation_fee,
            patient_status,
            alternative_name,
            alternative_cpf
        } = req.body;

        // Verificar campos obrigatórios
        if (!customer_name || !customer_cpf) {
            return res.status(400).json({ error: 'customer_name e customer_cpf são obrigatórios.' });
        }

        // Criação do usuário (ou obtenção de um usuário existente)
        const user = await User.create({
            user_name: customer_name,
            user_email: customer_email,
            // Outros campos necessários para criar o usuário
        });

        // Corrigir valor de patient_status
        const validPatientStatus = patient_status === 'true' ? true : patient_status === 'false' ? false : null;

        // Criação do cliente
        const newCustomer = await Customer.create({
            user_id: user.user_id, // Usar o ID gerado automaticamente
            customer_name,
            customer_cpf,
            customer_cnpj,
            customer_phone,
            customer_email,
            consultation_fee,
            patient_status: validPatientStatus,
            alternative_name,
            alternative_cpf
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
