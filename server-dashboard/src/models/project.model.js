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

  // Helper function to ensure numeric values
  ensureNumber(value) {
    if (value === null || value === undefined) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  // Helper function to calculate project status based on task statuses
  calculateProjectStatus(scrapingTasks) {
    if (!scrapingTasks || scrapingTasks.length === 0) return "pending";

    const runningCount = scrapingTasks.filter(task => 
      task.lastStatus === "Running"
    ).length;
    const failedCount = scrapingTasks.filter(task => 
      task.lastStatus === "Failed"
    ).length;
    const completedCount = scrapingTasks.filter(task => 
      task.lastStatus === "Successful"
    ).length;
    const totalCount = scrapingTasks.length;

    if (runningCount > 0) return "running";
    if (completedCount === totalCount) return "completed";
    if (failedCount === totalCount) return "failed";
    return "pending";
  }

  async createProject(projectData) {
    try {
      const now = new Date().toISOString();
      const project = {
        id: uuidv4(),
        name: projectData.name,
        status: projectData.status || "pending",
        createdAt: now,
        updatedAt: now,
        lastRun: now,
        success: 0,
        failed: 0,
        settings: {
          entireScraping: Boolean(projectData.settings.entireScraping),
          highPriority: Boolean(projectData.settings.highPriority),
          taskCount: this.ensureNumber(projectData.settings.taskCount),
          startDate: projectData.settings.startDate,
          customQuery: projectData.settings.customQuery || "",
        },
        filters: {
          states: Array.isArray(projectData.filters.states) ? projectData.filters.states : [],
          cities: Array.isArray(projectData.filters.cities) ? projectData.filters.cities : [],
          businessTypes: Array.isArray(projectData.filters.businessTypes) ? projectData.filters.businessTypes : [],
        },
        queryCount: this.ensureNumber(projectData.queryCount),
        queryIds: Array.isArray(projectData.queryIds) ? projectData.queryIds : [],
        scrapingTasks: Array.isArray(projectData.scrapingTasks) ? projectData.scrapingTasks.map(task => ({
          taskArn: String(task.taskArn || ''),
          taskDefinitionArn: String(task.taskDefinitionArn || ''),
          lastStatus: String(task.lastStatus || ''),
          createdAt: String(task.createdAt || ''),
          desiredStatus: String(task.desiredStatus || ''),
          group: String(task.group || ''),
          launchType: String(task.launchType || ''),
          containers: Array.isArray(task.containers) ? task.containers.map(container => ({
            name: String(container.name || ''),
            lastStatus: String(container.lastStatus || ''),
          })) : [],
        })) : [],
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
          if (typeof value === 'number') {
            expressionAttributeValues[`:value${index}`] = this.ensureNumber(value);
          } else {
            expressionAttributeValues[`:value${index}`] = value;
          }
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

  async updateTaskStatus(projectId, taskArn, newStatus, reason = 'normal') {
    try {
      // Get current project
      const project = await this.getProjectById(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Map status based on reason
      let mappedStatus;
      if (reason === 'manual') {
        mappedStatus = 'Stopped';
      } else if (reason === 'error') {
        mappedStatus = 'Failed';
      } else if (reason === 'completed') {
        mappedStatus = 'Successful';
      } else {
        mappedStatus = newStatus;
      }

      // Update task status in scrapingTasks array
      const updatedTasks = project.scrapingTasks.map(task => {
        if (task.taskArn === taskArn) {
          return {
            ...task,
            lastStatus: mappedStatus,
          };
        }
        return task;
      });

      // Calculate new project status
      const newProjectStatus = this.calculateProjectStatus(updatedTasks);

      // Update project with new task statuses and project status
      const updateData = {
        scrapingTasks: updatedTasks,
        status: newProjectStatus,
      };

      return await this.updateProject(projectId, updateData);
    } catch (error) {
      logger.error(`Error updating task status for project ${projectId}:`, error);
      throw error;
    }
  }

  async updateProjectStatus(id, status, success = false) {
    try {
      const project = await this.getProjectById(id);
      const updateData = {
        status,
        lastRun: new Date().toISOString(),
        success: this.ensureNumber(project.success) + (success ? 1 : 0),
        failed: this.ensureNumber(project.failed) + (success ? 0 : 1),
      };

      return await this.updateProject(id, updateData);
    } catch (error) {
      logger.error(`Error updating project status for ${id}:`, error);
      throw error;
    }
  }
}

module.exports = new ProjectModel();