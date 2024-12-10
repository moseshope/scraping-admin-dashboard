const {
  ECSClient,
  RegisterTaskDefinitionCommand,
  ListTaskDefinitionsCommand,
  RunTaskCommand,
} = require("@aws-sdk/client-ecs");
const logger = require("../utils/logger");
require("dotenv").config();

class ECSService {
  constructor() {
    // Load AWS credentials from environment variables
    const accessKeyId = process.env.REAL_ACCESS_KEY_ID;
    const secretAccessKey = process.env.REAL_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error("AWS credentials not found in environment variables");
    }

    this.client = new ECSClient({
      region: "us-west-1",
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.clusterName = "ScrapingCluster";
    this.taskDefinitionFamily = "scraping-task";
    this.subnetId = "subnet-0cef1fabb02085215";

    // Log initialization but not the credentials
    logger.info("ECS Service initialized with credentials");
  }

  async createTaskDefinition() {
    const command = new RegisterTaskDefinitionCommand({
      family: this.taskDefinitionFamily,
      networkMode: "awsvpc",
      containerDefinitions: [
        {
          name: "scraping-container",
          image:
            "426284527517.dkr.ecr.us-west-1.amazonaws.com/business-rate-scraper-module:latest",
          cpu: 1024,
          memory: 3072,
          essential: true,
          logConfiguration: {
            logDriver: "awslogs",
            options: {
              "awslogs-group": "/ecs/scraping-module",
              "awslogs-region": "us-west-1",
              "awslogs-stream-prefix": "ecs",
            },
          },
        },
      ],
      requiresCompatibilities: ["FARGATE"],
      cpu: "1024",
      memory: "3072",
      executionRoleArn: "arn:aws:iam::426284527517:role/ecsTaskExecutionRole",
      taskRoleArn: "arn:aws:iam::426284527517:role/ecsTaskExecutionRole",
    });

    try {
      const response = await this.client.send(command);
      logger.info("Task definition created successfully");
      return response.taskDefinition;
    } catch (error) {
      logger.error("Error creating task definition:", error);
      throw error;
    }
  }

  async getLatestTaskDefinition() {
    try {
      const command = new ListTaskDefinitionsCommand({
        familyPrefix: this.taskDefinitionFamily,
        sort: "DESC",
        maxResults: 1,
      });

      const response = await this.client.send(command);
      return response.taskDefinitionArns[0];
    } catch (error) {
      logger.error("Error getting latest task definition:", error);
      throw error;
    }
  }

  distributeQueries(queries, taskCount) {
    const queriesPerTask = Math.ceil(queries.length / taskCount);
    const distribution = [];

    for (let i = 0; i < taskCount; i++) {
      const start = i * queriesPerTask;
      const end = Math.min(start + queriesPerTask, queries.length);
      if (start < queries.length) {
        distribution.push(queries.slice(start, end));
      }
    }

    return distribution;
  }

  async runTasks(taskCount, queryList) {
    try {
      // Get or create task definition
      let taskDefinitionArn = await this.getLatestTaskDefinition();
      if (!taskDefinitionArn) {
        const taskDef = await this.createTaskDefinition();
        taskDefinitionArn = taskDef.taskDefinitionArn;
      }

      // Distribute queries among tasks
      const queryDistribution = this.distributeQueries(queryList, taskCount);
      const tasks = [];

      // Run tasks with their respective queries
      for (const queries of queryDistribution) {
        const command = new RunTaskCommand({
          cluster: this.clusterName,
          taskDefinition: taskDefinitionArn,
          launchType: "FARGATE",
          networkConfiguration: {
            awsvpcConfiguration: {
              subnets: [this.subnetId],
              assignPublicIp: "ENABLED",
            },
          },
          overrides: {
            containerOverrides: [
              {
                name: "scraping-container",
                environment: [
                  {
                    name: "QUERY_DATA",
                    value: JSON.stringify(queries),
                  },
                ],
              },
            ],
          },
        });

        const response = await this.client.send(command);
        tasks.push(...response.tasks);
      }

      logger.info(`Started ${tasks.length} tasks successfully`);
      return tasks;
    } catch (error) {
      logger.error("Error running tasks:", error);
      throw error;
    }
  }
}

module.exports = new ECSService();
