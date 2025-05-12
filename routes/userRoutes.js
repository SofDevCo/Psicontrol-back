const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.get("/users", userController.getUser);
router.put("/save-users", userController.editUser);
router.post("/payment-methods", userController.addPaymentMethod);
router.delete("/payment-methods/:method", userController.removePaymentMethod);

module.exports = router;
