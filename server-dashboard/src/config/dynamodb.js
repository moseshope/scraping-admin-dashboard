const AWS = require('aws-sdk');
const logger = require('../utils/logger');

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: process.env.DYNAMODB_LOCAL_ENDPOINT,
});

// Create DynamoDB client
const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

// Define table names
const TABLES = {
  USERS: 'Users',
};

// Create Users table if it doesn't exist
const createUsersTable = async () => {
  const params = {
    TableName: TABLES.USERS,
    KeySchema: [
      { AttributeName: 'email', KeyType: 'HASH' }, // Partition key
    ],
    AttributeDefinitions: [
      { AttributeName: 'email', AttributeType: 'S' },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  };

  try {
    await dynamodb.createTable(params).promise();
    logger.info(`Created table: ${TABLES.USERS}`);
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      logger.info(`Table already exists: ${TABLES.USERS}`);
    } else {
      logger.error('Error creating Users table:', error);
      throw error;
    }
  }
};

// Initialize DynamoDB tables
const initializeTables = async () => {
  try {
    await createUsersTable();
    logger.info('DynamoDB tables initialized successfully');
  } catch (error) {
    logger.error('Error initializing DynamoDB tables:', error);
    throw error;
  }
};

// Helper functions for common DynamoDB operations
const dynamoDbHelpers = {
  // Create or update an item
  put: async (tableName, item) => {
    const params = {
      TableName: tableName,
      Item: item,
    };
    try {
      await docClient.put(params).promise();
      return item;
    } catch (error) {
      logger.error(`Error putting item in ${tableName}:`, error);
      throw error;
    }
  },

  // Get an item by key
  get: async (tableName, key) => {
    const params = {
      TableName: tableName,
      Key: key,
    };
    try {
      const result = await docClient.get(params).promise();
      return result.Item;
    } catch (error) {
      logger.error(`Error getting item from ${tableName}:`, error);
      throw error;
    }
  },

  // Delete an item by key
  delete: async (tableName, key) => {
    const params = {
      TableName: tableName,
      Key: key,
    };
    try {
      await docClient.delete(params).promise();
    } catch (error) {
      logger.error(`Error deleting item from ${tableName}:`, error);
      throw error;
    }
  },

  // Query items
  query: async (tableName, keyConditionExpression, expressionAttributeValues) => {
    const params = {
      TableName: tableName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    };
    try {
      const result = await docClient.query(params).promise();
      return result.Items;
    } catch (error) {
      logger.error(`Error querying items from ${tableName}:`, error);
      throw error;
    }
  },
};

module.exports = {
  dynamodb,
  docClient,
  TABLES,
  initializeTables,
  ...dynamoDbHelpers,
};