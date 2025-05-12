const express = require("express");
const router = express.Router();
const dashBoardController = require("../controllers/dashBoardController");

router.get("/billing-records", dashBoardController.getBillingRecordsByMonthAndYear);
router.post("/update-partial-payment", dashBoardController.Partialpayment);
router.post("/save-payment", dashBoardController.savePayment);
router.post("/confirmBillOfSale", dashBoardController.confirmBillOfSale);
router.post('/revert-sending-invoice', dashBoardController.revertSendingInvoice);
router.post('/revert-payment-confirmation', dashBoardController.revertPaymentConfirmation);
router.post('/revert-bill-of-sale', dashBoardController.revertBillOfSale);

module.exports = router;
