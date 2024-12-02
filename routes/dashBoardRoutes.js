const express = require("express");
const router = express.Router();
const dashBoardController = require("../controllers/dashBoardController");

router.get("/billing-records", dashBoardController.getBillingRecordsByMonthAndYear);

module.exports = router;
