const express = require('express');
const router = express.Router();
const revenueController = require('../controllers/revenueController'); // Importa o controller

router.post('/revenue', revenueController.Revenue);
router.post('/expense', revenueController.addExpense);

router.get('/entries/:user_id', revenueController.getEntriesByUserId);

router.delete('/revenue/:id', revenueController.deleteRevenue);
router.delete('/expense/:id', revenueController.deleteExpense);

module.exports = router;