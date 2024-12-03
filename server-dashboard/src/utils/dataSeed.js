const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const { 
  DynamoDBClient,
  ListTablesCommand,
  CreateTableCommand,
  UpdateTableCommand
} = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient,
  BatchWriteCommand
} = require('@aws-sdk/lib-dynamodb');
const logger = require('./logger');

// Add direct console logging for immediate feedback
const log = (message) => {
  console.log(message);
  logger.info(message);
};

// DynamoDB client configuration
const client = new DynamoDBClient({
  endpoint: process.env.DYNAMODB_LOCAL_ENDPOINT || "http://dynamodb-local:8000",
  region: process.env.AWS_REGION || 'local',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local'
  }
});

const docClient = DynamoDBDocumentClient.from(client);

// Table configuration with higher throughput
const TABLE_NAME = 'estimates';
const TABLE_CONFIG = {
  TableName: TABLE_NAME,
  KeySchema: [
    { AttributeName: 'id', KeyType: 'HASH' }
  ],
  AttributeDefinitions: [
    { AttributeName: 'id', AttributeType: 'N' }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 100,
    WriteCapacityUnits: 2000
  }
};

// Helper function to chunk array into smaller arrays
const chunkArray = (arr, size) => {
  return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );
};

// Retry function with exponential backoff
async function retryWithBackoff(fn, retries = 3, backoff = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, backoff));
    return retryWithBackoff(fn, retries - 1, backoff * 2);
  }
}

// Process chunks in parallel with controlled concurrency
async function processChunksInParallel(chunks, concurrency = 25) {
  let completedChunks = 0;
  const totalChunks = chunks.length;
  const startTime = Date.now();
  
  for (let i = 0; i < chunks.length; i += concurrency) {
    const chunkGroup = chunks.slice(i, i + concurrency);
    const promises = chunkGroup.map(async (chunk) => {
      const writeRequests = chunk.map(record => ({
        PutRequest: {
          Item: {
            id: parseInt(record.id),
            city: record.city,
            state: record.state,
            category: record.category,
            count: parseInt(record.count),
            pending: parseInt(record.pending),
            bcount: parseInt(record.bcount)
          }
        }
      }));

      try {
        await retryWithBackoff(async () => {
          await docClient.send(new BatchWriteCommand({
            RequestItems: {
              [TABLE_NAME]: writeRequests
            }
          }));
        });
        
        completedChunks++;
        if (completedChunks % 100 === 0 || completedChunks === totalChunks) {
          const progress = ((completedChunks / totalChunks) * 100).toFixed(2);
          const elapsedMinutes = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
          const rate = (completedChunks / elapsedMinutes).toFixed(2);
          const estimatedTotalMinutes = ((totalChunks / completedChunks) * elapsedMinutes).toFixed(2);
          log(`Progress: ${progress}% (${completedChunks}/${totalChunks} chunks) | Rate: ${rate} chunks/min | Est. total time: ${estimatedTotalMinutes} min`);
        }
        return chunk.length;
      } catch (error) {
        console.error('Error writing chunk:', error);
        throw error;
      }
    });

    const results = await Promise.all(promises);
    const processedInBatch = results.reduce((a, b) => a + b, 0);
    log(`Processed batch of ${processedInBatch} records`);
  }
}

// Create table if it doesn't exist
async function createTableIfNotExists() {
  try {
    log('Checking if table exists...');
    const listTablesCommand = new ListTablesCommand({});
    const tables = await client.send(listTablesCommand);
    
    if (!tables.TableNames.includes(TABLE_NAME)) {
      log(`Table ${TABLE_NAME} does not exist. Creating with high capacity...`);
      const createTableCommand = new CreateTableCommand(TABLE_CONFIG);
      await client.send(createTableCommand);
      log(`Created table ${TABLE_NAME}`);
      
      // Wait for table to be active
      log('Waiting for table to be active...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      log('Table should be active now');
    } else {
      log(`Table ${TABLE_NAME} exists. Updating capacity...`);
      const updateParams = {
        TableName: TABLE_NAME,
        ProvisionedThroughput: {
          ReadCapacityUnits: 100,
          WriteCapacityUnits: 2000
        }
      };
      await client.send(new UpdateTableCommand(updateParams));
      log('Updated table capacity');
    }
  } catch (error) {
    console.error('Error with table operation:', error);
    throw error;
  }
}

// Main function to seed data
async function seedData() {
  // Use the mounted CSV file path in the container
  const csvFilePath = path.resolve('/usr/src/app/full_estimate.csv');
  
  try {
    log('Starting data seeding process...');
    log(`Reading CSV file from: ${csvFilePath}`);
    
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found at: ${csvFilePath}`);
    }
    
    await createTableIfNotExists();

    const records = [];
    log('Parsing CSV file...');
    
    const parser = fs
      .createReadStream(csvFilePath)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true
      }));

    for await (const record of parser) {
      records.push(record);
    }

    log(`Found ${records.length} records in CSV file`);
    
    // Create chunks of maximum size (25 items per batch)
    const chunks = chunkArray(records, 25);
    log(`Split into ${chunks.length} chunks of max 25 records each`);
    
    // Process chunks with parallel execution
    const startTime = Date.now();
    await processChunksInParallel(chunks);
    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    
    log(`Successfully seeded ${records.length} records to DynamoDB in ${totalTime} minutes`);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

// Execute if running directly
if (require.main === module) {
  log('Starting optimized data seed script...');
  seedData().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { seedData };