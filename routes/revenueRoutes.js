const express = require('express');
const router = express.Router();
const revenueController = require('../controllers/revenueController'); 

router.post('/revenue/:user_id', revenueController.addRevenue);
router.post('/expense/:user_id', revenueController.addExpense);

router.get('/revenue/:user_id', revenueController.getRevenueByUserId);
router.get('/expense/:user_id', revenueController.getExpenseByUserId);

router.get('/entries/:user_id', revenueController.getEntriesByUserId);

router.delete('/revenue/:id', revenueController.deleteRevenue);
router.delete('/expense/:id', revenueController.deleteExpense);


module.exports = router;