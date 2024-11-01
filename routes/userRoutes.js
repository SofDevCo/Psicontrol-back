const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.get("/users", userController.getUser);     // Exemplo de rota GET
router.put("/users", userController.editUser);     // Exemplo de rota PUT

module.exports = router;
