const { User } = require("../models");

exports.sendWhatsAppMessage = async (req, res) => {
    const userId = req.user.user_id;
    const { user_phone } = req.body;
  
    if (!user_phone) {
      return res.status(400).json({ error: "Número de telefone é obrigatório." });
    }
  
    const user = await User.findOne({
      where: {
        user_id: userId,
      },
    });
  
    if (!user || !user.user_message) {
      return res.status(404).json({ error: "Mensagem não encontrada." });
    }
  
    const message = user.user_message;
  
    const formattedPhoneNumber = user_phone.replace(/\D/g, "");
  
    const encodedMessage = encodeURIComponent(message);
  
    const whatsappLink = `https://wa.me/${formattedPhoneNumber}?text=${encodedMessage}`;
  
    res.status(200).json({ whatsappLink });
  };