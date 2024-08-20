const { oauth2Client, authUrl } = require('../config/oauth2');

async function handleOAuth2Callback(req, res) {
    const { code } = req.query;
    if (!code) {
        return res.status(400).send('Código de autorização ausente.');
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        res.send(`
            <p>Autenticação concluída! Agora você pode criar eventos.</p>
            <a href="/events/create-event-form">Clique aqui para criar um evento</a>
        `);
    } catch (error) {
        console.error('Erro ao obter o token de autenticação:', error);
        res.status(500).send('Erro ao concluir a autenticação.');
    }
}

module.exports = { handleOAuth2Callback, authUrl };
