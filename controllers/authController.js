const { google } = require("googleapis");
const {
  User,
  Calendar,
  Event,
  Customer,
  CustomersBillingRecords,
} = require("../models");
const Fuse = require("fuse.js");
const { Op } = require("sequelize");
const { parseISO, format } = require("date-fns");
const { oauth2Client, authUrl } = require("../config/oauth2");
const { saveTokens } = require("./tokenController");
const { updateConsultationDays } = require("../utils/updateFunctions");
const calendar = google.calendar({ version: "v3", auth: oauth2Client });
const { v4: uuidv4 } = require("uuid");

const fetchGoogleCalendars = async (accessToken) => {
  oauth2Client.setCredentials({ access_token: accessToken });
  const response = await calendar.calendarList.list();
  return response.data.items;
};

const getLastDayOfMonth = (year, month) => {
  const nextMonth = new Date(year, month + 1, 0);
  return nextMonth.getDate();
};

const fetchGoogleCalendarEvents = async (accessToken, calendarId) => {
  oauth2Client.setCredentials({ access_token: accessToken });

  const now = new Date();

  const firstDayPreviousMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
    0,
    0,
    0,
    0
  );
  const lastDayNextMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 2,
    0,
    23,
    59,
    59,
    999
  );

  const response = await calendar.events.list({
    calendarId: calendarId,
    timeMin: firstDayPreviousMonth.toISOString(),
    timeMax: lastDayNextMonth.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    showDeleted: true,
  });

  return response.data.items.map((event) => ({
    ...event,
    start: {
      ...event.start,
      dateTime: event.start.dateTime
        ? new Date(event.start.dateTime).toISOString()
        : null,
    },
  }));
};

const syncGoogleCalendarWithDatabase = async (accessToken) => {
  oauth2Client.setCredentials({ access_token: accessToken });
  const calendars = await fetchGoogleCalendars(accessToken);
  const user = await User.findOne({ where: { access_token: accessToken } });

  for (const calendar of calendars) {
    const calendarId = calendar.id;

    let dbCalendar = await Calendar.findOne({
      where: { calendar_id: calendarId, user_id: user.user_id },
    });

    if (!dbCalendar) {
      dbCalendar = await Calendar.create({
        calendar_id: calendarId,
        calendar_name: calendar.summary,
        user_id: user.user_id,
        enabled: false,
      });
    }

    if (!dbCalendar.enabled) {
      continue;
    }

    const events = await fetchGoogleCalendarEvents(accessToken, calendarId);
    const unmatchedEvents = [];
    const processedEvents = new Set();

    for (const event of events) {
      const rawSummary = (event.summary || "Evento Sem Título").trim();

      if (event.status === "cancelled") {
        await Event.update(
          { status: "cancelado" },
          {
            where: {
              google_event_id: event.id,
              calendar_id: { [Op.ne]: null },
              user_id: user.user_id,
            },
          }
        );
        continue;
      }

      if (rawSummary.length > 255) {
        unmatchedEvents.push({
          event_name: rawSummary,
          date:
            event.start?.dateTime?.slice(0, 10) || event.start?.date || null,
          user_id: user.user_id,
          note: "Nome muito longo",
        });
        continue;
      }

      const summary = rawSummary;
      const uniqueKey = `${summary}_${event.id}`;

      if (processedEvents.has(uniqueKey)) continue;
      processedEvents.add(uniqueKey);

      const existingEvents = await Event.findAll({
        where: { google_event_id: event.id, user_id: user.user_id },
      });

      if (!event.summary) console.warn("Evento sem summary:", event);

      let patients = await Customer.findAll({
        where: { deleted: false, user_id: user.user_id },
      });

      const cleanSummary = summary.replace(/^Paciente - /i, "").trim();

      let bestMatch = patients.find(
        (p) =>
          p.customer_calendar_name
            .replace(/^Paciente - /i, "")
            .trim()
            .toLowerCase() === cleanSummary.toLowerCase()
      );

      if (!bestMatch) {
        const cleanPatients = patients.map((p) => ({
          ...p,
          customer_calendar_name: p.customer_calendar_name
            .replace(/^Paciente - /i, "")
            .trim(),
        }));

        const fuse = new Fuse(cleanPatients, {
          keys: ["customer_calendar_name"],
          threshold: 0.2,
          distance: 100,
          includeScore: true,
          findAllMatches: true,
        });

        const result = fuse.search(cleanSummary);
        bestMatch =
          result.length > 0 && result[0].score < 0.15 ? result[0].item : null;
      }

      let customerId = bestMatch ? bestMatch.customer_id : null;

      let startDate = null,
        startTime = null,
        endTime = null;

      if (event.start?.dateTime) {
        const dateTime = event.start.dateTime;
        startDate = format(parseISO(dateTime), "yyyy-MM-dd");
        startTime = dateTime.split("T")[1].split(":").slice(0, 2).join(":");
        endTime = event.end?.dateTime
          ? event.end.dateTime.split("T")[1].split(":").slice(0, 2).join(":")
          : startTime;
      } else if (event.start?.date) {
        startDate = event.start.date;
      }

      const userId = user.user_id;

      const eventExistsForUser = existingEvents.some(
        (e) => e.user_id === userId && e.google_event_id === event.id
      );

      if (!eventExistsForUser) {
        await Event.create({
          event_name: summary,
          date: startDate,
          google_event_id: event.id,
          status:
            existingEvents.length > 0 &&
            existingEvents[0].status === "cancelado"
              ? "cancelado"
              : event.status === "cancelled"
              ? "cancelado"
              : event.status,
          calendar_id: calendarId,
          start_time: startTime,
          end_time: endTime,
          user_id: userId,
          customer_id: customerId,
        });
      }

      if (customerId) {
        await updateConsultationDays(customerId);

        const billingRecords = await CustomersBillingRecords.findAll({
          where: { customer_id: customerId },
          attributes: [
            "id",
            "customer_id",
            "month_and_year",
            "consultation_days",
            "consultation_fee",
          ],
        });

        for (const record of billingRecords) {
          const daysCount = record.consultation_days
            ? record.consultation_days.split(",").filter(Boolean).length
            : 0;
          const uniFee = parseFloat(record.consultation_fee) || 0;
          const totalFee = (daysCount * uniFee).toFixed(2);

          await record.update({ total_consultation_fee: totalFee });
        }
      } else {
        unmatchedEvents.push({
          event_name: summary,
          date: startDate,
          user_id: userId,
        });
      }
    }

    global.unmatchedEventsCache = unmatchedEvents;
  }
};

async function initiateGoogleAuth(req, res) {
  const { state } = req.query;
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state,
  });

  return res.redirect(authUrl);
}

async function handleOAuth2Callback(req, res) {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send("Código de autorização ausente.");
  }

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const formData = JSON.parse(decodeURIComponent(state || "{}"));
  const { name, phone, occupation, crp, noCRP, action } = formData;

  let oauth2 = google.oauth2({
    auth: oauth2Client,
    version: "v2",
  });
  const { data } = await oauth2.userinfo.get();

  if (!data.email) {
    return res.status(400).json({ message: "Email não encontrado." });
  }

  await saveTokens(
    data.name,
    data.email,
    tokens.access_token,
    tokens.refresh_token
  );

  let user = await User.findOne({ where: { user_email: data.email } });

  if (action === "register") {
    if (user) {
      return res.redirect(
        `${process.env.LANDINGPAGE_URL}/register?error=email_exists`
      );
    }
    user = await User.create({
      user_name: name || data.name,
      user_email: data.email,
      user_phone: phone || null,
      occupation: occupation || "Estudante",
      crp_number: !noCRP && crp ? crp : null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
  } else {
    if (!user) {
      return res.redirect(
        `${process.env.LANDINGPAGE_URL}/login?error=user_not_found`
      );
    }
    user.access_token = tokens.access_token;
    user.refresh_token = tokens.refresh_token;
  }

  user.autentication_token = uuidv4();
  await user.save();

  await syncGoogleCalendarWithDatabase(tokens.access_token);
  res.redirect(
    `${process.env.FRONTEND_URL}/token?token=${user.autentication_token}`
  );
}

const checkAndHandleCalendars = async (req, res) => {
  const userId = req.user?.user_id;

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado." });
  }

  const enabledCalendars = await Calendar.findAll({
    where: { user_id: userId, enabled: true },
  });

  if (!enabledCalendars || enabledCalendars.length === 0) {
    return res.json({ hasCalendars: false });
  }

  const calendarIds = enabledCalendars.map((calendar) => calendar.calendar_id);

  return res.json({
    hasCalendars: true,
    calendarIds,
    redirect: `/create-event-form?calendarIds=${calendarIds.join(",")}`,
  });
};

module.exports = {
  handleOAuth2Callback,
  initiateGoogleAuth,
  syncGoogleCalendarWithDatabase,
  fetchGoogleCalendarEvents,
  fetchGoogleCalendars,
  checkAndHandleCalendars,
};
