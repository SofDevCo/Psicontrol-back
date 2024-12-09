const { User, Customer } = require("../models");

exports.sendWhatsAppMessage = async (req, res) => {
  const userId = req.user.user_id;  
  const { customer_id } = req.body; 

  if (!customer_id) {
    return res.status(400).json({ error: "ID do cliente é obrigatório." });
  }

  const user = await User.findOne({
    where: { user_id: userId },
  });

  if (!user || !user.user_message) {
    return res.status(404).json({ error: "Mensagem não encontrada para o usuário." });
  }

  const customer = await Customer.findOne({
    where: { customer_id: customer_id },
  });

  if (!customer || !customer.customer_phone) {
    return res.status(404).json({ error: "Telefone do cliente não encontrado." });
  }

  const message = user.user_message;
  const customerPhone = customer.customer_phone;

  const formattedPhoneNumber = customerPhone.replace(/\D/g, "");

  const encodedMessage = encodeURIComponent(message);

  const whatsappLink = `https://wa.me/${formattedPhoneNumber}?text=${encodedMessage}`;

  res.status(200).json({ 
    user_message: message,
    whatsappLink });
};