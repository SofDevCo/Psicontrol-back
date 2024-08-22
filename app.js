require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { oauth2Client, authUrl } = require('./config/oauth2');
const eventRoutes = require('./routes/eventRoutes');
const { handleOAuth2Callback } = require('./controllers/authController');

const app = express();
const port = 3000;

// Configurar o bodyParser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Servir arquivos estáticos da pasta 'views'
app.use(express.static(path.join(__dirname, 'views')));

// Rota principal
app.get('/', (req, res) => {
    res.send(`
        <h1>Bem-vindo!</h1>
        <p>Faça login com o Google para sincronizar seu Google Calendar com o banco de dados.</p>
        <a href="${authUrl}">Login com o Google</a>
    `);
});

// Rota de callback do OAuth2
app.get('/oauth2callback', handleOAuth2Callback);

// Rotas para eventos
app.use('/events', eventRoutes);

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
