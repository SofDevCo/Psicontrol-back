const express = require('express');
const router = express.Router();
const { handleOAuth2Callback, authUrl, initiateGoogleAuth, getUserId } = require('../controllers/authController');

router.get('/', (req, res) => {
    res.send(`
        <h1>Bem-vindo ao Sistema de Eventos</h1>
        <p><a href="${authUrl}">Continuar com o Google Calendar</a></p>
    `);
});

router.get('/oauth2callback', handleOAuth2Callback);
router.get('/google', initiateGoogleAuth);

router.get('/get-user-id', getUserId);

module.exports = router;
