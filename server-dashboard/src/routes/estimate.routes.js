const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");
const estimateModel = require("../models/estimate.model");
const ecsService = require("../services/ecs.service");
const projectModel = require("../models/project.model");

// Get all unique states
router.get("/getStates", async (req, res) => {
  try {
    const states = await estimateModel.getUniqueStates();
    res.json({ states });
  } catch (error) {
    logger.error("Error getting states:", error);
    res.status(500).json({ error: "Failed to get states" });
  }
});

// Get cities in a state
router.get("/getCitiesInStates", async (req, res) => {
  const { stateName } = req.query;

  if (!stateName) {
    return res.status(400).json({ error: "State name is required" });
  }

  try {
    const cities = await estimateModel.getCitiesInState(stateName);
    res.json({ cities });
  } catch (error) {
    logger.error("Error getting cities:", error);
    res.status(500).json({ error: "Failed to get cities" });
  }
});

// Get query IDs based on filters
router.post("/getQueryIds", async (req, res) => {
  const { scrapingMode, filter } = req.body;

  try {
    const ids = await estimateModel.getQueryIds(scrapingMode, filter);
    res.json({ ids });
  } catch (error) {
    logger.error("Error getting query IDs:", error);
    res.status(500).json({ error: "Failed to get query IDs" });
  }
});

// Start scraping tasks
router.post("/startScraping", async (req, res) => {
  const { taskCount, queryList, startDate } = req.body;

  if (
    !taskCount ||
    !Number.isInteger(Number(taskCount)) ||
    Number(taskCount) <= 0
  ) {
    return res.status(400).json({ error: "Valid task count is required" });
  }

  if (!Array.isArray(queryList) || queryList.length === 0) {
    return res
      .status(400)
      .json({ error: "Query list is required and must not be empty" });
  }

  if (!startDate) {
    return res.status(400).json({ error: "Start date is required" });
  }

  // Check if start date is today
  const today = new Date();
  const startDateObj = new Date(startDate);
  const isToday =
    today.toISOString().split("T")[0] ===
    startDateObj.toISOString().split("T")[0];

  if (!isToday) {
    return res.status(400).json({ error: "Start date must be today for immediate task execution" });
  }

  try {
    // Get or create task definition and run tasks with distributed queries
    const tasks = await ecsService.runTasks(Number(taskCount), queryList);

    // Return the tasks information
    res.json({
      message: `Successfully started ${tasks.length} scraping tasks`,
      tasks: tasks.map((task) => ({
        taskArn: task.taskArn,
        taskDefinitionArn: task.taskDefinitionArn,
        lastStatus: task.lastStatus,
        createdAt: task.createdAt,
        desiredStatus: task.desiredStatus,
        group: task.group,
        launchType: task.launchType,
        containers: task.containers?.map((container) => ({
          name: container.name,
          lastStatus: container.lastStatus,
        })),
      })),
    });
  } catch (error) {
    logger.error("Error starting scraping tasks:", error);
    res.status(500).json({ error: "Failed to start scraping tasks" });
  }
});

// Get task performance metrics
router.get("/taskPerformance", async (req, res) => {
  try {
    const { startTime, endTime } = req.query;

    // Convert string dates to Date objects if provided
    const start = startTime ? new Date(startTime) : undefined;
    const end = endTime ? new Date(endTime) : undefined;

    // Validate date range if both are provided
    if (start && end && start > end) {
      return res
        .status(400)
        .json({ error: "Start time must be before end time" });
    }

    // Get task performance data from ECS service
    const performanceData = await ecsService.getTasksPerformance(start, end);

    // Update task statuses in projects
    const projects = await projectModel.getProjects();
    for (const project of projects) {
      let statusUpdated = false;
      const updatedTasks = project.scrapingTasks.map(projectTask => {
        const taskData = performanceData.find(t => t.taskArn === projectTask.taskArn);
        if (taskData) {
          statusUpdated = true;
          let newStatus;
          switch (taskData.status) {
            case 'RUNNING':
              newStatus = 'Running';
              break;
            case 'STOPPED':
              newStatus = projectTask.lastStatus === 'Running' ? 'Successful' : projectTask.lastStatus;
              break;
            case 'FAILED':
              newStatus = 'Failed';
              break;
            default:
              newStatus = projectTask.lastStatus;
          }
          return { ...projectTask, lastStatus: newStatus };
        }
        return projectTask;
      });

      if (statusUpdated) {
        await projectModel.updateProject(project.id, {
          scrapingTasks: updatedTasks,
          status: projectModel.calculateProjectStatus(updatedTasks)
        });
      }
    }

    res.json({
      message: "Successfully retrieved task performance data",
      data: performanceData,
    });
  } catch (error) {
    logger.error("Error getting task performance:", error);
    res.status(500).json({ error: "Failed to get task performance data" });
  }
});

// Start task
router.post("/startTask", async (req, res) => {
  const { taskId, projectId } = req.body;

  if (!taskId) {
    return res.status(400).json({ error: "Task ID is required" });
  }

  if (!projectId) {
    return res.status(400).json({ error: "Project ID is required" });
  }

  try {
    await projectModel.updateTaskStatus(projectId, taskId, "Running");
    res.json({
      message: "Task started successfully",
      taskId,
      status: "Running"
    });
  } catch (error) {
    logger.error("Error starting task:", error);
    res.status(500).json({ error: "Failed to start task" });
  }
});

// Stop task
router.post("/stopTask", async (req, res) => {
  const { taskId, projectId } = req.body;

  if (!taskId) {
    return res.status(400).json({ error: "Task ID is required" });
  }

  if (!projectId) {
    return res.status(400).json({ error: "Project ID is required" });
  }

  try {
    await ecsService.stopTask(taskId);
    await projectModel.updateTaskStatus(projectId, taskId, "Stopped", "manual");
    res.json({ 
      message: "Task stopped successfully",
      taskId,
      status: "Stopped"
    });
  } catch (error) {
    logger.error("Error stopping task:", error);
    res.status(500).json({ error: "Failed to stop task" });
  }
});

// Restart task
router.post("/restartTask", async (req, res) => {
  const { taskId, projectId } = req.body;

  if (!taskId) {
    return res.status(400).json({ error: "Task ID is required" });
  }

  if (!projectId) {
    return res.status(400).json({ error: "Project ID is required" });
  }

  try {
    const newTask = await ecsService.restartTask(taskId);
    await projectModel.updateTaskStatus(projectId, taskId, "Running");
    res.json({
      message: "Task restarted successfully",
      taskId: newTask.taskArn,
      status: "Running"
    });
  } catch (error) {
    logger.error("Error restarting task:", error);
    res.status(500).json({ error: "Failed to restart task" });
  }
});

// Get task logs
router.get("/taskLogs", async (req, res) => {
  const { taskId, startTime, endTime } = req.query;

  if (!taskId) {
    return res.status(400).json({ error: "Task ID is required" });
  }

  try {
    const start = startTime ? new Date(startTime) : undefined;
    const end = endTime ? new Date(endTime) : undefined;

    const logs = await ecsService.getTaskLogs(taskId, start, end);
    res.json({
      message: "Successfully retrieved task logs",
      logs,
    });
  } catch (error) {
    logger.error("Error getting task logs:", error);
    res.status(500).json({ error: "Failed to get task logs" });
  }
});

module.exports = router;