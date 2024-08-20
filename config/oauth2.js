const { google } = require('googleapis');
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    console.error('Faltam variáveis de ambiente necessárias.');
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
});

module.exports = { oauth2Client, authUrl };
