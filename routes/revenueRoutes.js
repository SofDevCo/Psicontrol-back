const express = require("express");
const router = express.Router();
const revenueController = require("../controllers/revenueController");

router.post("/revenue", revenueController.addRevenue);
router.post("/expense", revenueController.addExpense);

router.get("/revenue", revenueController.getRevenueByUserId);
router.get("/expense", revenueController.getExpenseByUserId);

router.get("/entries", revenueController.getEntriesByUserId);

router.delete("/revenue/:id", revenueController.deleteRevenue);
router.delete("/expense/:id", revenueController.deleteExpense);

module.exports = router;
