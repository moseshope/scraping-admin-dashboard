const { docClient, TABLES } = require('../config/dynamodb');
const logger = require('../utils/logger');

class EstimateModel {
  constructor() {
    this.tableName = TABLES.ESTIMATES;
  }

  async getUniqueStates() {
    try {
      const params = {
        TableName: this.tableName,
        ProjectionExpression: '#st',
        ExpressionAttributeNames: {
          '#st': 'state'
        }
      };

      const data = await docClient.scan(params).promise();
      return [...new Set(data.Items.map(item => item['state']))].sort();
    } catch (error) {
      logger.error('Error getting states:', error);
      throw error;
    }
  }

  async getCitiesInState(stateName) {
    try {
      const params = {
        TableName: this.tableName,
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

      const data = await docClient.scan(params).promise();
      return [...new Set(data.Items.map(item => item.city))].sort();
    } catch (error) {
      logger.error('Error getting cities:', error);
      throw error;
    }
  }

  async getQueryIds(scrapingMode, filter) {
    try {
      // If scrapingMode is 0 (entire mode), return all IDs
      if (scrapingMode === 0) {
        const params = {
          TableName: this.tableName,
          ProjectionExpression: '#id',
          ExpressionAttributeNames: {
            '#id': 'id'
          }
        };

        const data = await docClient.scan(params).promise();
        return data.Items.map(item => item.id);
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
            TableName: this.tableName,
            FilterExpression: filterExpression,
            ProjectionExpression: '#id',
            ExpressionAttributeNames: {
              ...expressionAttributeNames,
              '#id': 'id'
            },
            ExpressionAttributeValues: expressionAttributeValues
          };

          const data = await docClient.scan(params).promise();
          data.Items.forEach(item => allIds.add(item.id));
        }
      }

      return Array.from(allIds).sort((a, b) => a - b);
    } catch (error) {
      logger.error('Error getting query IDs:', error);
      throw error;
    }
  }
}

module.exports = new EstimateModel();