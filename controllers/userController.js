const { User } = require("../models");
const multer = require("multer");
const path = require("path");

// Configuração do multer para salvar imagens na pasta "uploads"
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), "uploads")); // Usa a raiz do projeto
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});

const upload = multer({ storage });

// Função para obter o usuário
exports.getUser = async (req, res) => {
  const userId = req.user.user_id;
  
  try {
    const user = await User.findOne({ where: { user_id: userId } });
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    // Inclui o caminho completo da imagem
    const userData = {
      ...user.dataValues,
      image: user.image ? `/uploads/${user.image}` : null,
    };

    res.status(200).json(userData);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar os dados do usuário." });
  }
};

// Função para editar o usuário com upload de imagem
exports.editUser = [
  upload.single("image"), // Middleware do multer para receber a imagem
  async (req, res) => {
    const userId = req.user.user_id;
    const { user_cpf, user_cnpj, crp_number, user_phone, user_message } = req.body;
    const imagePath = req.file ? req.file.path : null; // Caminho da imagem

    try {
      const user = await User.findOne({ where: { user_id: userId } });
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      await user.update({
        user_cpf,
        user_cnpj,
        crp_number,
        user_phone,
        user_message,
        image: imagePath, // Armazena o caminho da imagem
      });

      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar os dados do usuário." });
    }
  },
];
