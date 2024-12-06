const { docClient, TABLES } = require("../config/dynamodb");
const logger = require("../utils/logger");

class EstimateModel {
  constructor() {
    this.tableName = TABLES.ESTIMATES;
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

      const data = await docClient.scan(params).promise();
      return [...new Set(data.Items.map((item) => item["state"]))].sort();
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

      const data = await docClient.scan(params).promise();
      return [...new Set(data.Items.map((item) => item.city))].sort();
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

        const data = await docClient.scan(params).promise();
        return data.Items.map((item) => item.id);
      }

      // scrapingMode = 1, process filters
      const allIds = new Set();

      for (const stateFilter of filter) {
        const { state, filters } = stateFilter;

        // If no filters array or filters is empty, it means state-only selection
        if (!filters || filters.length === 0) {
          // Return all queries that match the selected state
          const params = {
            TableName: this.tableName,
            FilterExpression: "#st = :stateVal",
            ExpressionAttributeNames: {
              "#st": "state",
              "#id": "id",
            },
            ExpressionAttributeValues: {
              ":stateVal": state,
            },
            ProjectionExpression: "#id",
          };

          const data = await docClient.scan(params).promise();
          data.Items.forEach((item) => allIds.add(item.id));
        } else {
          // We have filters, which likely means city or city+businessType selection
          for (const cityFilter of filters) {
            const { city, businessType } = cityFilter;

            // If city is 'All', we should return all queries for that state, ignoring city
            if (city === "All") {
              const params = {
                TableName: this.tableName,
                FilterExpression: "#st = :stateVal",
                ExpressionAttributeNames: {
                  "#st": "state",
                  "#id": "id",
                },
                ExpressionAttributeValues: {
                  ":stateVal": state,
                },
                ProjectionExpression: "#id",
              };

              const data = await docClient.scan(params).promise();
              data.Items.forEach((item) => allIds.add(item.id));
            } else {
              // Filter by state and city
              let filterExpression = "#st = :stateVal AND #c = :cityVal";
              let expressionAttributeNames = {
                "#st": "state",
                "#c": "city",
                "#id": "id",
              };
              let expressionAttributeValues = {
                ":stateVal": state,
                ":cityVal": city,
              };

              // Add business type filter if specified and not empty
              if (businessType && businessType.length > 0) {
                // DynamoDB doesn't allow using "IN" directly with arrays in FilterExpression
                // We must use multiple OR conditions or a different approach
                // One approach: check if the businessType includes 'All'
                if (!businessType.includes("All")) {
                  // If we have an array of categories, we must filter them one by one
                  // DynamoDB doesn't have a direct "IN" operator for arrays.
                  // One workaround is to use "OR" conditions or re-scan multiple times.
                  // For simplicity, if businessType is multiple values, we can do multiple scans or
                  // build a condition like (#cat = :cat1 OR #cat = :cat2 ...)

                  const categoryFilters = businessType
                    .map((cat, idx) => `#cat = :catVal${idx}`)
                    .join(" OR ");
                  filterExpression += ` AND (${categoryFilters})`;
                  expressionAttributeNames["#cat"] = "category";

                  businessType.forEach((cat, idx) => {
                    expressionAttributeValues[`:catVal${idx}`] = cat;
                  });
                }
                // If 'All' is included, that means we don't filter by category at all.
              }

              const params = {
                TableName: this.tableName,
                FilterExpression: filterExpression,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                ProjectionExpression: "#id",
              };

              const data = await docClient.scan(params).promise();
              data.Items.forEach((item) => allIds.add(item.id));
            }
          }
        }
      }

      return Array.from(allIds).sort((a, b) => a - b);
    } catch (error) {
      logger.error("Error getting query IDs:", error);
      throw error;
    }
  }
}

module.exports = new EstimateModel();
