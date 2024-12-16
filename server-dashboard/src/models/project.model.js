const { docClient, TABLES } = require("../config/dynamodb");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

class ProjectModel {
  constructor() {
    this.tableName = TABLES.PROJECTS;
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

  async createProject(projectData) {
    try {
      const now = new Date().toISOString();
      const project = {
        id: uuidv4(),
        name: projectData.projectName,
        status: "pending",
        createdAt: now,
        updatedAt: now,
        lastRun: null,
        success: 0,
        failed: 0,
        settings: {
          entireScraping: projectData.entireScraping,
          highPriority: projectData.highPriority,
          taskCount: parseInt(projectData.taskCount),
          startDate: projectData.startDate,
          customQuery: projectData.customQuery || "",
        },
        filters: {
          states: projectData.selectedStates || [],
          cities: projectData.cities || [],
          businessTypes: projectData.businessTypes || [],
        },
        queryCount: projectData.queryCount,
        queryIds: projectData.queryIds || [],
        scrapingTasks: projectData.scrapingTasks || [],
      };

      const params = {
        TableName: this.tableName,
        Item: project,
      };

      await docClient.put(params).promise();
      logger.info(`Project created successfully: ${project.id}`);
      return project;
    } catch (error) {
      logger.error("Error creating project:", error);
      throw error;
    }
  }

  async getProjects() {
    try {
      const params = {
        TableName: this.tableName,
      };

      return await this.scanAllItems(params);
    } catch (error) {
      logger.error("Error getting projects:", error);
      throw error;
    }
  }

  async getProjectById(id) {
    try {
      const params = {
        TableName: this.tableName,
        Key: { id },
      };

      const result = await docClient.get(params).promise();
      return result.Item;
    } catch (error) {
      logger.error(`Error getting project ${id}:`, error);
      throw error;
    }
  }

  async updateProject(id, updateData) {
    try {
      const updateExpressionParts = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      Object.entries(updateData).forEach(([key, value], index) => {
        if (key !== "id") {
          updateExpressionParts.push(`#field${index} = :value${index}`);
          expressionAttributeNames[`#field${index}`] = key;
          expressionAttributeValues[`:value${index}`] = value;
        }
      });

      // Always update the updatedAt timestamp
      updateExpressionParts.push("#updatedAt = :updatedAt");
      expressionAttributeNames["#updatedAt"] = "updatedAt";
      expressionAttributeValues[":updatedAt"] = new Date().toISOString();

      const params = {
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW",
      };

      const result = await docClient.update(params).promise();
      logger.info(`Project updated successfully: ${id}`);
      return result.Attributes;
    } catch (error) {
      logger.error(`Error updating project ${id}:`, error);
      throw error;
    }
  }

  async deleteProject(id) {
    try {
      const params = {
        TableName: this.tableName,
        Key: { id },
      };

      await docClient.delete(params).promise();
      logger.info(`Project deleted successfully: ${id}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting project ${id}:`, error);
      throw error;
    }
  }

  async updateProjectStatus(id, status, success = false) {
    try {
      const project = await this.getProjectById(id);
      const updateData = {
        status,
        lastRun: new Date().toISOString(),
        success: project.success + (success ? 1 : 0),
        failed: project.failed + (success ? 0 : 1),
      };

      return await this.updateProject(id, updateData);
    } catch (error) {
      logger.error(`Error updating project status for ${id}:`, error);
      throw error;
    }
  }
}

module.exports = new ProjectModel();
