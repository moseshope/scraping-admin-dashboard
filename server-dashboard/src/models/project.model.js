const dynamoDB = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class ProjectModel {
  constructor() {
    this.tableName = 'Projects';
  }

  async createProject(projectData) {
    const now = new Date().toISOString();
    const project = {
      id: uuidv4(),
      name: projectData.projectName,
      status: 'pending',
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
        customQuery: projectData.customQuery || '',
      },
      filters: {
        states: projectData.selectedStates || [],
        cities: projectData.cities || [],
        businessTypes: projectData.businessTypes || [],
      },
      queryCount: projectData.queryCount,
      queryIds: projectData.queryIds || [],
      scrapingTasks: projectData.scrapingTasks || []
    };

    const params = {
      TableName: this.tableName,
      Item: project
    };

    try {
      await dynamoDB.put(params).promise();
      logger.info(`Project created successfully: ${project.id}`);
      return project;
    } catch (error) {
      logger.error('Error creating project:', error);
      throw error;
    }
  }

  async getProjects() {
    const params = {
      TableName: this.tableName
    };

    try {
      const result = await dynamoDB.scan(params).promise();
      return result.Items;
    } catch (error) {
      logger.error('Error getting projects:', error);
      throw error;
    }
  }

  async getProjectById(id) {
    const params = {
      TableName: this.tableName,
      Key: { id }
    };

    try {
      const result = await dynamoDB.get(params).promise();
      return result.Item;
    } catch (error) {
      logger.error(`Error getting project ${id}:`, error);
      throw error;
    }
  }

  async updateProject(id, updateData) {
    const updateExpressionParts = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    
    Object.entries(updateData).forEach(([key, value], index) => {
      if (key !== 'id') {
        updateExpressionParts.push(`#field${index} = :value${index}`);
        expressionAttributeNames[`#field${index}`] = key;
        expressionAttributeValues[`:value${index}`] = value;
      }
    });

    // Always update the updatedAt timestamp
    updateExpressionParts.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const params = {
      TableName: this.tableName,
      Key: { id },
      UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    try {
      const result = await dynamoDB.update(params).promise();
      logger.info(`Project updated successfully: ${id}`);
      return result.Attributes;
    } catch (error) {
      logger.error(`Error updating project ${id}:`, error);
      throw error;
    }
  }

  async deleteProject(id) {
    const params = {
      TableName: this.tableName,
      Key: { id }
    };

    try {
      await dynamoDB.delete(params).promise();
      logger.info(`Project deleted successfully: ${id}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting project ${id}:`, error);
      throw error;
    }
  }

  async updateProjectStatus(id, status, success = false) {
    const updateData = {
      status,
      lastRun: new Date().toISOString()
    };

    if (success !== undefined) {
      const project = await this.getProjectById(id);
      updateData.success = project.success + (success ? 1 : 0);
      updateData.failed = project.failed + (success ? 0 : 1);
    }

    return this.updateProject(id, updateData);
  }
}

module.exports = new ProjectModel();