const cron = require("node-cron");
const https = require("https");
const {
  syncGoogleCalendarWithDatabase,
} = require("../controllers/authController");
const {
  getAllAccessToken,
  refreshAccessToken,
  updateAccessToken,
} = require("../services/getTokenService");

const healthcheckUrl =
  "https://hc-ping.com/62402598-fbb6-4377-89f6-c970acd804fa";

const sendHealthcheckPing = () => {
  https
    .get(healthcheckUrl, (res) => {
      if (res.statusCode === 200) {
        console.log("Ping enviado com sucesso para o Healthcheck!");
      } else {
        console.log(`Falha ao enviar ping: Status ${res.statusCode}`);
      }
    })
    .on("error", (err) => {
      console.error("Erro ao enviar ping para o Healthcheck:", err);
    });
};

const syncAllCalendars = async () => {
  const users = await getAllAccessToken();

  for (const user of users) {
    const { user_id, refresh_token: refreshToken } = user;

    if (refreshToken) {
      const newAccessToken = await refreshAccessToken(refreshToken);
      await updateAccessToken(user_id, newAccessToken);

      await syncGoogleCalendarWithDatabase(newAccessToken);
    }
  }
};

// cron.schedule("*/2 * * * *", sendHealthcheckPing);

cron.schedule("5 * * * *", async () => {
  await syncAllCalendars();
});
