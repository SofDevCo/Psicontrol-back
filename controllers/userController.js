const { User } = require("../models");
const multer = require("multer");
const path = require("path");
const {
  validateCPFOrCNPJ,
  validatePhoneNumber,
  validateEmail,
  validateCRP,
} = require("../utils/Validators");

const storage = multer.diskStorage({
  destination: (cb) => {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: (file, cb) => {
    const fileName = file.originalname.replace(/\s+/g, "_");
    cb(null, fileName);
  },
});

const upload = multer({ storage });

exports.getUser = async (req, res) => {
  const userId = req.user.user_id;

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
};

exports.editUser = [
  upload.single("image"),
  async (req, res) => {
    const userId = req.user.user_id;
    let {
      user_cpf,
      user_cnpj,
      crp_number,
      user_phone,
      user_message,
      clinic_name,
      user_email,
    } = req.body;
    const imagePath = req.file ? req.file.filename : null;

    const user = await User.findOne({ where: { user_id: userId } });
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (user_cpf && !validateCPFOrCNPJ(user_cpf)) {
      return res.status(400).json({ error: "CPF inválido." });
    }
    if (user_cnpj && !validateCPFOrCNPJ(user_cnpj)) {
      return res.status(400).json({ error: "CNPJ inválido." });
    }

    if (crp_number && !validateCRP(crp_number)) {
      return res
        .status(400)
        .json({ error: "CRP inválido. O formato correto é XX/XXXXX" });
    }

    const formattedPhone = user_phone
      ? validatePhoneNumber(user_phone, "BR", "53")
      : null;
    if (user_phone && !formattedPhone) {
      return res.status(400).json({ error: "Número de telefone inválido." });
    }

    if (user_email) {
      const emailValidation = validateEmail(user_email);

      if (!emailValidation || !emailValidation.isValid) {
        return res.status(400).json({ error: "E-mail inválido." });
      }

      user_email = emailValidation.formatted || user_email;
    }

    await user.update({
      user_cpf: user_cpf || user.user_cpf,
      user_cnpj: user_cnpj || user.user_cnpj,
      crp_number: crp_number || user.crp_number,
      user_phone: formattedPhone || user.user_phone,
      user_email: user_email || user.user_email,
      user_message: user_message || user.user_message,
      clinic_name: clinic_name || user.clinic_name,
      image: imagePath || user.image,
    });

    res.status(200).json({
      ...user.dataValues,
      image: user.image ? `/uploads/${user.image}` : null,
    });
  },
];
