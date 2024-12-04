const express = require('express');
const router = express.Router();
const whatsappController = require("../controllers/whatsappController");

router.post('/send-whatsapp',whatsappController.sendWhatsAppMessage);

module.exports = router;