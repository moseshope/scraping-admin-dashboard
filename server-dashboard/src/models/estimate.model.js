const { docClient, TABLES } = require("../config/dynamodb");
const logger = require("../utils/logger");

class EstimateModel {
  constructor() {
    this.tableName = TABLES.ESTIMATES;
  }

  // Helper function to scan all items with pagination
  async scanAllItems(params) {
    let items = [];
    let data;
    do {
      data = await docClient.scan(params).promise();
      items = items.concat(data.Items);
      params.ExclusiveStartKey = data.LastEvaluatedKey;
    } while (typeof data.LastEvaluatedKey !== "undefined");
    return items;
  }

  async getUniqueStates() {
    try {
      const params = {
        TableName: this.tableName,
        ProjectionExpression: "#st",
        ExpressionAttributeNames: {
          "#st": "state",
        },
      };

      const allData = await this.scanAllItems(params);
      return [...new Set(allData.map((item) => item["state"]))].sort();
    } catch (error) {
      logger.error("Error getting states:", error);
      throw error;
    }
  }

  async getCitiesInState(stateName) {
    try {
      const params = {
        TableName: this.tableName,
        FilterExpression: "#st = :state",
        ProjectionExpression: "#c",
        ExpressionAttributeNames: {
          "#st": "state",
          "#c": "city",
        },
        ExpressionAttributeValues: {
          ":state": stateName,
        },
      };

      const allData = await this.scanAllItems(params);
      return [...new Set(allData.map((item) => item.city))].sort();
    } catch (error) {
      logger.error("Error getting cities:", error);
      throw error;
    }
  }

  async getQueryIds(scrapingMode, filter) {
    try {
      // If scrapingMode is 0 (entire mode), return all IDs
      if (scrapingMode === 0) {
        const params = {
          TableName: this.tableName,
          ProjectionExpression: "#id",
          ExpressionAttributeNames: {
            "#id": "id",
          },
        };

        const allData = await this.scanAllItems(params);
        return allData.map((item) => item.id);
      }

      // scrapingMode = 1, process filters
      const allIds = new Set();

      for (const stateFilter of filter) {
        const { state, filters } = stateFilter;
        const { cities = ['All'], businessTypes = ['All'] } = filters;

        // Build the filter expression
        let filterExpression = "#st = :stateVal";
        let expressionAttributeNames = {
          "#st": "state",
          "#id": "id",
        };
        let expressionAttributeValues = {
          ":stateVal": state,
        };

        // Add city filter if specified
        if (!cities.includes('All')) {
          filterExpression += " AND #c IN (";
          expressionAttributeNames["#c"] = "city";
          
          cities.forEach((city, idx) => {
            const cityKey = `:cityVal${idx}`;
            filterExpression += idx === 0 ? cityKey : `, ${cityKey}`;
            expressionAttributeValues[cityKey] = city;
          });
          filterExpression += ")";
        }

        // Add business type filter if specified
        if (!businessTypes.includes('All')) {
          filterExpression += " AND #cat IN (";
          expressionAttributeNames["#cat"] = "category";
          
          businessTypes.forEach((type, idx) => {
            const typeKey = `:typeVal${idx}`;
            filterExpression += idx === 0 ? typeKey : `, ${typeKey}`;
            expressionAttributeValues[typeKey] = type;
          });
          filterExpression += ")";
        }

        const params = {
          TableName: this.tableName,
          FilterExpression: filterExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ProjectionExpression: "#id",
        };

        const allData = await this.scanAllItems(params);
        allData.forEach((item) => allIds.add(item.id));
      }

      return Array.from(allIds).sort((a, b) => a - b);
    } catch (error) {
      logger.error("Error getting query IDs:", error);
      throw error;
    }
  }
}

module.exports = new EstimateModel();