require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const { oauth2Client, authUrl } = require('./config/oauth2');
const eventRoutes = require('./routes/eventRoutes');
const { handleOAuth2Callback, initiateGoogleAuth } = require('./controllers/authController');

const app = express();
const port = 3000;

app.use(cors({
    origin: 'http://localhost:3001', // Substitua pela URL do seu frontend
    credentials: true // Permite o envio de cookies e headers de autorização
}));


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'views')));

// Rota principal
app.get('/', (req, res) => {
    res.send('API de Eventos. Use as rotas disponíveis para gerenciar eventos.');
});

app.get('/google', initiateGoogleAuth);
app.get('/oauth2callback', handleOAuth2Callback);
app.use('/events', eventRoutes);

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
