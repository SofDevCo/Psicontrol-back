const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.get("/users", userController.getUser);
router.post("/register-user", userController.registerUser);
router.put("/save-users", userController.editUser);

module.exports = router;
