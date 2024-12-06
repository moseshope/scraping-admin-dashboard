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

          const allData = await this.scanAllItems(params);
          allData.forEach((item) => allIds.add(item.id));
        } else {
          // We have filters (city or city+businessType)
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

              const allData = await this.scanAllItems(params);
              allData.forEach((item) => allIds.add(item.id));
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

              // Add business type filter if specified
              if (businessType && businessType.length > 0) {
                if (!businessType.includes("All")) {
                  // Build OR conditions for multiple business types
                  const categoryConditions = businessType
                    .map((cat, idx) => `#cat = :catVal${idx}`)
                    .join(" OR ");
                  filterExpression += ` AND (${categoryConditions})`;
                  expressionAttributeNames["#cat"] = "category";

                  businessType.forEach((cat, idx) => {
                    expressionAttributeValues[`:catVal${idx}`] = cat;
                  });
                }
                // If 'All' is included, we do not add a category filter
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
