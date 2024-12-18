const {
  ECSClient,
  RegisterTaskDefinitionCommand,
  ListTaskDefinitionsCommand,
  RunTaskCommand,
  ListTasksCommand,
  DescribeTasksCommand,
  StopTaskCommand,
} = require("@aws-sdk/client-ecs");
const {
  CloudWatchClient,
  GetMetricDataCommand,
} = require("@aws-sdk/client-cloudwatch");
const logger = require("../utils/logger");
require("dotenv").config();

class ECSService {
  constructor() {
    const accessKeyId = process.env.REAL_ACCESS_KEY_ID;
    const secretAccessKey = process.env.REAL_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error("AWS credentials not found in environment variables");
    }

    const awsConfig = {
      region: "us-west-1",
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    };

    this.client = new ECSClient(awsConfig);
    this.cloudWatch = new CloudWatchClient(awsConfig);

    this.clusterName = "TestScrapingCluster";
    this.serviceName = "test-scraping-service";
    this.taskDefinitionFamily = "test-scraping-task";
    this.subnetId = "subnet-0cef1fabb02085215";

    logger.info("ECS Service initialized with credentials");
  }

  async createTaskDefinition() {
    const command = new RegisterTaskDefinitionCommand({
      family: this.taskDefinitionFamily,
      networkMode: "awsvpc",
      containerDefinitions: [
        {
          name: "test-scraping-container",
          image:
            "426284527517.dkr.ecr.us-west-1.amazonaws.com/test-business-rate-scraping-module:latest",
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
      let taskDefinitionArn = await this.getLatestTaskDefinition();
      if (!taskDefinitionArn) {
        const taskDef = await this.createTaskDefinition();
        taskDefinitionArn = taskDef.taskDefinitionArn;
      }

      const queryDistribution = this.distributeQueries(queryList, taskCount);
      const tasks = [];

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
                name: "test-scraping-container",
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

  async stopTask(taskId) {
    try {
      const command = new StopTaskCommand({
        cluster: this.clusterName,
        task: taskId,
        reason: "Stopped by user",
      });

      await this.client.send(command);
      logger.info(`Task ${taskId} stopped successfully`);
    } catch (error) {
      logger.error(`Error stopping task ${taskId}:`, error);
      throw error;
    }
  }

  async restartTask(taskId) {
    try {
      // First get the task details
      const describeTaskCommand = new DescribeTasksCommand({
        cluster: this.clusterName,
        tasks: [taskId],
      });

      const taskInfo = await this.client.send(describeTaskCommand);
      if (!taskInfo.tasks || taskInfo.tasks.length === 0) {
        throw new Error(`Task ${taskId} not found`);
      }

      const task = taskInfo.tasks[0];

      // Stop the existing task
      await this.stopTask(taskId);

      // Start a new task with the same configuration
      const command = new RunTaskCommand({
        cluster: this.clusterName,
        taskDefinition: task.taskDefinitionArn,
        launchType: task.launchType,
        networkConfiguration: task.networkConfiguration,
        overrides: task.overrides,
      });

      const response = await this.client.send(command);
      logger.info(`Task ${taskId} restarted successfully`);
      return response.tasks[0];
    } catch (error) {
      logger.error(`Error restarting task ${taskId}:`, error);
      throw error;
    }
  }

  async getTasksPerformance(startTime, endTime) {
    try {
      // Get all tasks including stopped ones
      const listTasksCommand = new ListTasksCommand({
        cluster: this.clusterName,
        desiredStatus: "STOPPED",
      });

      const runningTasksCommand = new ListTasksCommand({
        cluster: this.clusterName,
        desiredStatus: "RUNNING",
      });

      const [stoppedTasksList, runningTasksList] = await Promise.all([
        this.client.send(listTasksCommand),
        this.client.send(runningTasksCommand),
      ]);

      const allTaskArns = [
        ...(stoppedTasksList.taskArns || []),
        ...(runningTasksList.taskArns || []),
      ];

      if (allTaskArns.length === 0) {
        logger.info("No tasks found in cluster");
        return [];
      }

      // Get details for all tasks
      const describeTasksCommand = new DescribeTasksCommand({
        cluster: this.clusterName,
        tasks: allTaskArns,
      });

      const tasksInfo = await this.client.send(describeTasksCommand);
      logger.info(`Found ${tasksInfo.tasks.length} tasks`);

      const metricDataQueries = tasksInfo.tasks.flatMap((task, index) => {
        const taskId = task.taskArn.split("/").pop();
        logger.info(`Getting metrics for task ${taskId}`);

        return [
          {
            Id: `cpu_${index}`,
            MetricStat: {
              Metric: {
                Namespace: "AWS/ECS",
                MetricName: "CPUUtilization",
                Dimensions: [
                  { Name: "ClusterName", Value: this.clusterName },
                  { Name: "ServiceName", Value: this.serviceName },
                  { Name: "TaskId", Value: taskId },
                ],
              },
              Period: 60,
              Stat: "Average",
            },
            ReturnData: true,
          },
          {
            Id: `memory_${index}`,
            MetricStat: {
              Metric: {
                Namespace: "AWS/ECS",
                MetricName: "MemoryUtilization",
                Dimensions: [
                  { Name: "ClusterName", Value: this.clusterName },
                  { Name: "ServiceName", Value: this.serviceName },
                  { Name: "TaskId", Value: taskId },
                ],
              },
              Period: 60,
              Stat: "Average",
            },
            ReturnData: true,
          },
        ];
      });

      logger.info(
        "CloudWatch Query:",
        JSON.stringify(metricDataQueries, null, 2)
      );

      const metricsCommand = new GetMetricDataCommand({
        MetricDataQueries: metricDataQueries,
        StartTime: startTime || new Date(Date.now() - 3600000),
        EndTime: endTime || new Date(),
        ScanBy: "TimestampDescending",
      });

      logger.info("Fetching CloudWatch metrics...");
      const metricsData = await this.cloudWatch.send(metricsCommand);
      logger.info(
        `Got metrics data with ${metricsData.MetricDataResults.length} results`
      );
      logger.info(
        "Metrics Data:",
        JSON.stringify(metricsData.MetricDataResults, null, 2)
      );

      return tasksInfo.tasks.map((task, index) => {
        const taskId = task.taskArn.split("/").pop();
        const cpuData = metricsData.MetricDataResults[index * 2];
        const memoryData = metricsData.MetricDataResults[index * 2 + 1];

        logger.info(
          `Task ${taskId} CPU data points: ${cpuData?.Values?.length || 0}`
        );
        logger.info(
          `Task ${taskId} Memory data points: ${memoryData?.Values?.length || 0}`
        );

        const latestCPU = cpuData?.Values?.[0] || 0;
        const latestMemory = memoryData?.Values?.[0] || 0;

        return {
          taskId,
          taskArn: task.taskArn,
          status: task.lastStatus,
          startedAt: task.startedAt,
          stoppedAt: task.stoppedAt,
          cpu: {
            current: latestCPU,
            history: cpuData?.Values?.map((value, i) => ({
              value,
              timestamp: cpuData.Timestamps[i],
            })) || [],
          },
          memory: {
            current: latestMemory,
            history: memoryData?.Values?.map((value, i) => ({
              value,
              timestamp: memoryData.Timestamps[i],
            })) || [],
          },
          containers: task.containers?.map((container) => ({
            name: container.name,
            lastStatus: container.lastStatus,
            image: container.image,
            cpu: container.cpu,
            memory: container.memory,
          })) || [],
        };
      });
    } catch (error) {
      logger.error("Error getting tasks performance:", error);
      logger.error("Error details:", error.stack);
      throw error;
    }
  }
}

module.exports = new ECSService();