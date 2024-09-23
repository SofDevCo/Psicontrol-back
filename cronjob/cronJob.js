const cron = require('node-cron');
const { syncGoogleCalendarWithDatabase, fetchGoogleCalendars } = require('../controllers/authController');
const { getAllAccessToken, refreshAccessToken, updateAccessToken } = require('../services/getTokenService');

const syncAllCalendars = async () => {
    try {
        const users = await getAllAccessToken();

        for (const user of users) {
            const { user_id, refresh_token: refreshToken } = user;

            if (!refreshToken) {
                console.error(`No refresh token available for user: ${user_id}`);
                continue;
            }

            try {
                const newAccessToken = await refreshAccessToken(refreshToken);
                await updateAccessToken(user_id, newAccessToken);
                console.log(`Access token updated for user: ${user_id}`);

                await fetchGoogleCalendars(newAccessToken);
                console.log(`Calendars fetched for user: ${user_id}`);s

                await syncGoogleCalendarWithDatabase(newAccessToken);
                console.log(`Google Calendar synchronized for user: ${user_id}`);
            } catch (error) {
                console.error(`Error processing user ${user_id}:`, error);
            }
        }

        console.log('All calendars synchronized successfully!');
    } catch (error) {
        console.error('Error syncing all calendars:', error);
    }
};

cron.schedule('* */1 * * *', async () => {
    console.log('Executing cron job...');
    try {
        await syncAllCalendars(); 
    } catch (error) {
        console.error('Error executing cron job:', error);
    }
});

console.log('Cron job configured to synchronize calendars every 1 minute.');
