const express = require('express');
const router = express.Router();
const messageController = require("../controllers/messageController");

router.post('/send-whatsapp',messageController.sendWhatsAppMessage);
router.post('/send-email', messageController.sendEmailMessage);

module.exports = router;