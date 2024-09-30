const jwt = require("jsonwebtoken");
const { User } = require("../models");

exports.verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    return res.status(403).send("Token não fornecido.");
  }

  const user = User.findOne({ where: { autentication_token: token } }).then(user => {
    req.user = user ;
    next();
  })
};
