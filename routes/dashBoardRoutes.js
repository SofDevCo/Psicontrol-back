const express = require("express");
const router = express.Router();
const dashBoardController = require("../controllers/dashBoardController");

router.get("/billing-records", dashBoardController.getBillingRecordsByMonthAndYear);
router.post("/update-partial-payment", dashBoardController.Partialpayment);
router.post("/confirm-payment", dashBoardController.confirmPayment);

module.exports = router;
