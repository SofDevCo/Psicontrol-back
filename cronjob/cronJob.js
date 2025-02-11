const cron = require("node-cron");
const {
  syncGoogleCalendarWithDatabase,
  fetchGoogleCalendars,
} = require("../controllers/authController");
const {
  getAllAccessToken,
  refreshAccessToken,
  updateAccessToken,
} = require("../services/getTokenService");

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

cron.schedule("5 * * * *", async () => {
  await syncAllCalendars();
});
