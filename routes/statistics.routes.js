const express = require('express');
const router = express.Router();
const { getProductStatistics } = require('../controllers/statistics.controller');
const { getOrderStatistics } = require('../controllers/statistics.controller');
const { getInventoryStatistics } = require('../controllers/statistics.controller');

const verifyAdmin = require('../middlewares/authAdmin');

router.get('/products', verifyAdmin, getProductStatistics);
router.get('/orders', verifyAdmin, getOrderStatistics);
router.get("/inventory",verifyAdmin, getInventoryStatistics );

module.exports = router;
