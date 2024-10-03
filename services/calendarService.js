const { google } = require("googleapis");
const { oauth2Client } = require("../config/oauth2");

const calendar = google.calendar({ version: "v3", auth: oauth2Client });

exports.listCalendars = async () => {
  oauth2Client.setCredentials(oauth2Client.credentials);
  const response = await calendar.calendarList.list();
  return response.data.items;
};
