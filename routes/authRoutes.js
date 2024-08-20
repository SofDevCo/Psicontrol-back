const express = require('express');
const router = express.Router();
const { handleOAuth2Callback, authUrl } = require('../controllers/authController');

// Rota principal
router.get('/', (req, res) => {
    res.send(`
        <h1>Bem-vindo ao Sistema de Eventos</h1>
        <p><a href="${authUrl}">Autenticar com o Google Calendar</a></p>
    `);
});

// Rota de callback do OAuth2
router.get('/oauth2callback', handleOAuth2Callback);

module.exports = router;
