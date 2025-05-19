const { google } = require("googleapis");
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  ],
});

module.exports = { oauth2Client, authUrl };
