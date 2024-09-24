require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const { oauth2Client, authUrl } = require('./config/oauth2');
const eventRoutes = require('./routes/eventRoutes');
const revenueRoutes = require('./routes/revenueRoutes'); // Importa as rotas de receitas e despesas
const { handleOAuth2Callback, initiateGoogleAuth } = require('./controllers/authController');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'views')));

app.get('/', (req, res) => {
    res.send('API de Eventos. Use as rotas disponíveis para gerenciar eventos.');
});

app.get('/google', initiateGoogleAuth);
app.get('/oauth2callback', handleOAuth2Callback);
app.use('/events', eventRoutes);
app.use('/income', revenueRoutes); // Define o prefixo '/revenue' para rotas de receitas e despesas

require('./cronjob/cronJob');

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
