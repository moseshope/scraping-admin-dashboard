const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");
const estimateModel = require("../models/estimate.model");
const ecsService = require("../services/ecs.service");

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

  // if (!isToday) {
  //   return res.status(400).json({ error: 'Start date must be today for immediate task execution' });
  // }

  try {
    // Get or create task definition and run tasks with distributed queries
    const tasks = await ecsService.runTasks(Number(taskCount), queryList);

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

module.exports = router;
