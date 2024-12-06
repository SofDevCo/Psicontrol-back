require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const { oauth2Client, authUrl } = require("./config/oauth2");
const eventRoutes = require("./routes/eventRoutes");
const revenueRoutes = require("./routes/revenueRoutes"); 
const userRoutes = require("./routes/userRoutes");
const dashBoardRoutes = require("./routes/dashBoardRoutes");
const whatsappRoutes = require("./routes/whatsappRoutes");
const {
  handleOAuth2Callback,
  initiateGoogleAuth,
} = require("./controllers/authController");
const { verifyToken } = require("./middleware/authMiddleware");
const app = express();
const port = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "views")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("API de Eventos. Use as rotas disponíveis para gerenciar eventos.");
});

app.get("/google", initiateGoogleAuth);
app.get("/oauth2callback", handleOAuth2Callback);
app.use("/events", verifyToken, eventRoutes);
app.use("/income", verifyToken, revenueRoutes);
app.use("/dashboard", verifyToken, dashBoardRoutes);
app.use("/user", verifyToken, userRoutes);
app.get("/auth/google/callback", handleOAuth2Callback);
require("./cronjob/cronJob");
app.use("/whatsapp", verifyToken, whatsappRoutes);

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
