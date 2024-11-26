const { User } = require("../models");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: (req, file, cb) => {
    const fileName = file.originalname.replace(/\s+/g, "_");
    cb(null, fileName); 
  },
});

const upload = multer({ storage });

exports.getUser = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const user = await User.findOne({ where: { user_id: userId } });
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    res.status(200).json({
      user_id: user.user_id,
      user_name: user.user_name,
      user_cpf: user.user_cpf,
      user_cnpj: user.user_cnpj,
      crp_number: user.crp_number,
      user_phone: user.user_phone,
      user_email: user.user_email,
      user_message: user.user_message,
      clinic_name: user.clinic_name, 
      image: user.image ? `/uploads/${user.image}` : null,
    });
  } catch (error) {
    console.error("Erro no getUser:", error);
    res.status(500).json({ error: "Erro ao buscar os dados do usuário." });
  }
};


// Função para editar o usuário com upload de imagem
exports.editUser = [
  upload.single("image"),
  async (req, res) => {
    const userId = req.user.user_id;
    const { user_cpf, user_cnpj, crp_number, user_phone, user_message, clinic_name } = req.body;
    const imagePath = req.file ? req.file.filename : null;

    console.log("Mensagem recebida no back-end:", user_message); // Log de verificação

    try {
      const user = await User.findOne({ where: { user_id: userId } });
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      await user.update({
        user_cpf: user_cpf || user.user_cpf,
        user_cnpj: user_cnpj || user.user_cnpj,
        crp_number: crp_number || user.crp_number,
        user_phone: user_phone || user.user_phone,
        user_message: user_message || user.user_message, 
        clinic_name: clinic_name || user.clinic_name,
        image: imagePath || user.image,
      });
  

      res.status(200).json({
        ...user.dataValues,
        image: user.image ? `/uploads/${user.image}` : null,
      });
    } catch (error) {
      console.error("Erro ao atualizar o usuário:", error);
      res.status(500).json({ error: "Erro ao atualizar os dados do usuário." });
    }
  },
];
