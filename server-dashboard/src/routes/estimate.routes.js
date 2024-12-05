const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
const logger = require('../utils/logger');

// Configure DynamoDB
const dynamodb = new AWS.DynamoDB.DocumentClient({
  endpoint: process.env.DYNAMODB_LOCAL_ENDPOINT || "http://dynamodb-local:8000",
  region: process.env.AWS_REGION || "local",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "local",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "local"
});

const TABLE_NAME = 'Estimates';

// Get all unique states
router.get('/getStates', async (req, res) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      ProjectionExpression: '#st',
      ExpressionAttributeNames: {
        '#st': 'state'
      }
    };

    const data = await dynamodb.scan(params).promise();
    const states = [...new Set(data.Items.map(item => item['state']))].sort();

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
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: '#st = :state',
      ProjectionExpression: '#c',
      ExpressionAttributeNames: {
        '#st': 'state',
        '#c': 'city'
      },
      ExpressionAttributeValues: {
        ':state': stateName
      }
    };

    const data = await dynamodb.scan(params).promise();
    const cities = [...new Set(data.Items.map(item => item.city))].sort();

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
    // If scrapingMode is 0 (entire mode), return all IDs
    if (scrapingMode === 0) {
      const params = {
        TableName: TABLE_NAME,
        ProjectionExpression: '#id',
        ExpressionAttributeNames: {
          '#id': 'id'
        }
      };

      const data = await dynamodb.scan(params).promise();
      const ids = data.Items.map(item => item.id);
      return res.json({ ids });
    }

    // Process filters
    const allIds = new Set();
    
    for (const stateFilter of filter) {
      const { state, filters } = stateFilter;
      
      for (const cityFilter of filters) {
        const { city, businessType } = cityFilter;
        
        let filterExpression = '#st = :state AND #c = :city';
        let expressionAttributeNames = {
          '#st': 'state',
          '#c': 'city'
        };
        let expressionAttributeValues = {
          ':state': state,
          ':city': city
        };

        // Add business type filter if specified
        if (businessType && businessType.length > 0) {
          filterExpression += ' AND #cat IN (:categories)';
          expressionAttributeNames['#cat'] = 'category';
          expressionAttributeValues[':categories'] = businessType;
        }

        const params = {
          TableName: TABLE_NAME,
          FilterExpression: filterExpression,
          ProjectionExpression: '#id',
          ExpressionAttributeNames: {
            ...expressionAttributeNames,
            '#id': 'id'
          },
          ExpressionAttributeValues: expressionAttributeValues
        };

        const data = await dynamodb.scan(params).promise();
        data.Items.forEach(item => allIds.add(item.id));
      }
    }

    res.json({ ids: Array.from(allIds).sort((a, b) => a - b) });
  } catch (error) {
    logger.error('Error getting query IDs:', error);
    res.status(500).json({ error: 'Failed to get query IDs' });
  }
});

module.exports = router;