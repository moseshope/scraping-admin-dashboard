const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");
const estimateModel = require("../models/estimate.model");
const ecsService = require("../services/ecs.service");
const projectModel = require("../models/project.model");

// Helper function to check task logs and determine status
async function checkTaskLogsAndUpdateStatus(taskId, projectId, currentStatus) {
  try {
    const logs = await ecsService.getTaskLogs(taskId);
    const isSuccessful = logs.some(log => log.includes("All estimates processed successfully"));
    const hasFailed = logs.some(log => log.includes("error: "));

    if (isSuccessful) {
      await projectModel.updateTaskStatus(projectId, taskId, "Successful", "auto");
      return "Successful";
    } else if (hasFailed) {
      await projectModel.updateTaskStatus(projectId, taskId, "Failed", "auto");
      return "Failed";
    }
    return currentStatus;
  } catch (error) {
    logger.error(`Error checking logs for task ${taskId}:`, error);
    return currentStatus;
  }
}

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

    // Get all projects to get task ARNs
    const projects = await projectModel.getProjects();

    // Get performance data for all tasks
    const performanceData = await ecsService.getTasksPerformance(start, end);

    // Update task statuses in projects
    for (const project of projects) {
      if (!project.scrapingTasks) continue;

      const updatedTasks = await Promise.all(project.scrapingTasks.map(async projectTask => {
        const taskData = performanceData.find(t => t.taskArn === projectTask.taskArn);
        let newStatus = projectTask.lastStatus;
        let controller = projectTask.controller || 'auto';

        if (taskData) {
          switch (taskData.status) {
            case 'RUNNING':
              newStatus = 'Running';
              break;
            case 'STOPPED':
              // Always check logs for stopped tasks
              const logs = await ecsService.getTaskLogs(projectTask.taskArn);
              if (logs.some(log => log.includes("All estimates processed successfully"))) {
                newStatus = 'Successful';
                controller = 'auto';
              } else if (logs.some(log => log.includes("error: "))) {
                newStatus = 'Failed';
                controller = 'auto';
              }
              break;
            case 'FAILED':
              newStatus = 'Failed';
              break;
            case 'PROVISIONING':
              newStatus = 'Running';
              break;
          }
        }

        // Always update task status in database
        await projectModel.updateTaskStatus(project.id, projectTask.taskArn, newStatus, controller);
        return { ...projectTask, lastStatus: newStatus, controller };
      }));

      // Update project with new task statuses
      await projectModel.updateProject(project.id, {
        scrapingTasks: updatedTasks,
        status: projectModel.calculateProjectStatus(updatedTasks)
      });
    }

    // Return only performance metrics
    res.json({
      message: "Successfully retrieved task performance data",
      data: performanceData.map(task => ({
        taskArn: task.taskArn,
        cpu: task.cpu,
        memory: task.memory,
        status: task.status
      })),
    });
  } catch (error) {
    logger.error("Error getting task performance:", error);
    res.status(500).json({ error: "Failed to get task performance data" });
  }
});

// Get tasks by project ID
router.get("/getTasksByProjectId/:projectId", async (req, res) => {
  const { projectId } = req.params;

  if (!projectId) {
    return res.status(400).json({ error: "Project ID is required" });
  }

  try {
    const project = await projectModel.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({
      message: "Successfully retrieved project tasks",
      tasks: project.scrapingTasks || [],
    });
  } catch (error) {
    logger.error(`Error getting tasks for project ${projectId}:`, error);
    res.status(500).json({ error: "Failed to get project tasks" });
  }
});

// Get task logs and check for success
router.get("/taskLogs/:taskId", async (req, res) => {
  const { taskId } = req.params;
  const { projectId } = req.query;

  if (!taskId) {
    return res.status(400).json({ error: "Task ID is required" });
  }

  if (!projectId) {
    return res.status(400).json({ error: "Project ID is required" });
  }

  try {
    const logs = await ecsService.getTaskLogs(taskId);
    const isSuccessful = logs.some(log => log.includes("All estimates processed successfully"));
    const hasFailed = logs.some(log => log.includes("error: "));

    let status = "Stopped";
    if (isSuccessful) {
      status = "Successful";
      await projectModel.updateTaskStatus(projectId, taskId, status, "auto");
    } else if (hasFailed) {
      status = "Failed";
      await projectModel.updateTaskStatus(projectId, taskId, status, "auto");
    }

    res.json({
      message: "Successfully retrieved task logs",
      logs,
      isSuccessful,
      status
    });
  } catch (error) {
    logger.error("Error getting task logs:", error);
    res.status(500).json({ error: "Failed to get task logs" });
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
    await projectModel.updateTaskStatus(projectId, taskId, "Running", "auto");
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
    // First stop the task in AWS ECS
    await ecsService.stopTask(taskId);

    // Check logs to determine final status
    const logs = await ecsService.getTaskLogs(taskId);
    const isSuccessful = logs.some(log => log.includes("All estimates processed successfully"));
    const hasFailed = logs.some(log => log.includes("error: "));

    let status = "Stopped";
    let controller = "manual";

    if (isSuccessful) {
      status = "Successful";
      controller = "auto";
    } else if (hasFailed) {
      status = "Failed";
      controller = "auto";
    }

    await projectModel.updateTaskStatus(projectId, taskId, status, controller);

    res.json({ 
      message: "Task stopped successfully",
      taskId,
      status
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
    await projectModel.updateTaskStatus(projectId, taskId, "Running", "auto");
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

module.exports = router;