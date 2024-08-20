require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { oauth2Client, authUrl } = require('./config/oauth2');
const eventRoutes = require('./routes/eventRoutes');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Rota principal
app.get('/', (req, res) => {
    res.send(`<a href="${authUrl}">Autenticar com o Google Calendar</a>`);
});

// Rota de callback do OAuth2
app.get('/oauth2callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).send('Código de autorização ausente.');
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        console.log('Tokens:', tokens);
        res.send(`
            <p>Autenticação concluída! Agora você pode criar eventos.</p>
            <a href="/events/create-event-form">Clique aqui para criar um evento</a>
        `);
    } catch (error) {
        console.error('Erro ao obter o token de autenticação:', error);
        res.status(500).send('Erro ao concluir a autenticação.');
    }
});

// Rotas para eventos
app.use('/events', eventRoutes);

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
