require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const { oauth2Client, authUrl } = require('./config/oauth2');
const eventRoutes = require('./routes/eventRoutes');
const revenueRoutes = require('./routes/revenueRoutes'); // Importa as rotas de receitas e despesas
const { handleOAuth2Callback, initiateGoogleAuth, getUserId } = require('./controllers/authController');
const { verifyToken } = require('./middleware/authMiddleware');
const app = express();
const port = 3000;


const corsOptions = {
    origin: 'http://localhost:3001',
    credentials: true,
  };
  
app.use(cors(corsOptions));
  
//app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'views')));

app.get('/', (req, res) => {
    res.send('API de Eventos. Use as rotas disponíveis para gerenciar eventos.');
});

app.get('/google', initiateGoogleAuth);
app.get('/oauth2callback', handleOAuth2Callback);
app.use('/events',eventRoutes);
app.use('/income',revenueRoutes); 
app.get('/auth/google/callback', handleOAuth2Callback);
app.get('/get-user-id', getUserId);

    // if (req.session && req.session.userId) {
    //     res.json({ userId: req.session.userId });
    // } else { res.status(401).send('User not found')};


require('./cronjob/cronJob');

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
