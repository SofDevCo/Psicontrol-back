const express = require('express');
const router = express.Router();
const whatsappController = require("../controllers/whatsappController");
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/send-whatsapp', verifyToken, whatsappController.sendWhatsAppMessage);

module.exports = router;