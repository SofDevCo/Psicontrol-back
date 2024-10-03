const express = require("express");
const router = express.Router();
const {
  handleOAuth2Callback,
  authUrl,
  initiateGoogleAuth,
} = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");
const { getCustomers } = require("../controllers/customerController");

router.get("/", (req, res) => {
  res.send(`
        <h1>Bem-vindo ao Sistema de Eventos</h1>
        <p><a href="${authUrl}">Continuar com o Google Calendar</a></p>
    `);
});

router.get("/oauth2callback", handleOAuth2Callback);
router.get("/google", initiateGoogleAuth);
router.get("/auth/google/callback", handleOAuth2Callback);

module.exports = router;
