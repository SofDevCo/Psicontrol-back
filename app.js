require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const { oauth2Client, authUrl } = require("./config/oauth2");
// const healthcheckRoutes = require("./routes/healthcheckRoutes");
const eventRoutes = require("./routes/eventRoutes");
const revenueRoutes = require("./routes/revenueRoutes");
const userRoutes = require("./routes/userRoutes");
const dashBoardRoutes = require("./routes/dashBoardRoutes");
const messageRoutes = require("./routes/messageRoutes");
const Rollbar = require("rollbar");
const {
  handleOAuth2Callback,
  initiateGoogleAuth,
} = require("./controllers/authController");
const { verifyToken } = require("./middleware/authMiddleware");
const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: [
    process.env.FRONTEND_URL,
    "https://app.psicontrol.com.br/",
    "http://localhost:3001/",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "Origin"],
};

app.use(cors(corsOptions));

// const rollbar = new Rollbar({
//   accessToken: "769eaa6035aa4191af9e0fb92c4b5c37",
//   captureUncaught: true,
//   captureUnhandledRejections: true,
// });

// app.use(rollbar.errorHandler());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "views")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("API de Eventos. Use as rotas disponíveis para gerenciar eventos.");
});

//app.use("/webhook", healthcheckRoutes);

app.get("/auth/google", initiateGoogleAuth);
app.get("/oauth2callback", handleOAuth2Callback);
app.use("/events", verifyToken, eventRoutes);
app.use("/income", verifyToken, revenueRoutes);
app.use("/dashboard", verifyToken, dashBoardRoutes);
app.use("/user", verifyToken, userRoutes);
require("./cronjob/cronJob");
app.use("/message", verifyToken, messageRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
