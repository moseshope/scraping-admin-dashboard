const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const estimateModel = require('../models/estimate.model');

// Get all unique states
router.get('/getStates', async (req, res) => {
  try {
    const states = await estimateModel.getUniqueStates();
    res.json({ states });
  } catch (error) {
    logger.error('Error getting states:', error);
    res.status(500).json({ error: 'Failed to get states' });
  }
});

// Get cities in a state
router.get('/getCitiesInStates', async (req, res) => {
  const { stateName } = req.query;

  if (!stateName) {
    return res.status(400).json({ error: 'State name is required' });
  }

  try {
    const cities = await estimateModel.getCitiesInState(stateName);
    res.json({ cities });
  } catch (error) {
    logger.error('Error getting cities:', error);
    res.status(500).json({ error: 'Failed to get cities' });
  }
});

// Get query IDs based on filters
router.post('/getQueryIds', async (req, res) => {
  const { scrapingMode, filter } = req.body;

  try {
    const ids = await estimateModel.getQueryIds(scrapingMode, filter);
    res.json({ ids });
  } catch (error) {
    logger.error('Error getting query IDs:', error);
    res.status(500).json({ error: 'Failed to get query IDs' });
  }
});

module.exports = router;