const express = require("express");
const router = express.Router();
const projectModel = require("../models/project.model");
const logger = require("../utils/logger");
const { verifyToken } = require("../middleware/auth.middleware");
const {
  createProjectSchema,
  updateProjectStatusSchema,
  validateResults,
} = require("../utils/validation.schemas");

// Create a new project
router.post(
  "/",
  [verifyToken, ...createProjectSchema, validateResults],
  async (req, res) => {
    try {
      // Check if a project with the same name exists
      const existingProjects = await projectModel.getProjects();
      const existingProject = existingProjects.find(p => p.name === req.body.name);
      
      if (existingProject) {
        // If project exists, update it with new tasks
        const updatedProject = {
          ...existingProject,
          scrapingTasks: [
            ...existingProject.scrapingTasks,
            ...req.body.scrapingTasks
          ],
          queryCount: existingProject.queryCount + req.body.queryCount,
          settings: {
            ...existingProject.settings,
            taskCount: existingProject.settings.taskCount + req.body.settings.taskCount
          },
          updatedAt: new Date().toISOString()
        };
        
        const project = await projectModel.updateProject(existingProject.id, updatedProject);
        logger.info(`Project updated with new tasks: ${project.id}`);
        res.json(project);
      } else {
        // Create new project
        const project = await projectModel.createProject(req.body);
        logger.info(`Project created successfully: ${project.id}`);
        res.status(201).json(project);
      }
    } catch (error) {
      logger.error("Error creating/updating project:", error);
      res.status(500).json({ error: "Failed to create/update project" });
    }
  }
);

// Get all projects
router.get("/", verifyToken, async (req, res) => {
  try {
    const projects = await projectModel.getProjects();
    res.json(projects);
  } catch (error) {
    logger.error("Error getting projects:", error);
    res.status(500).json({ error: "Failed to get projects" });
  }
});

// Get project by ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const project = await projectModel.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (error) {
    logger.error(`Error getting project ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to get project" });
  }
});

// Update project
router.put(
  "/:id",
  [
    verifyToken,
    ...createProjectSchema.map((validation) => validation.optional()),
    validateResults,
  ],
  async (req, res) => {
    try {
      const project = await projectModel.updateProject(req.params.id, req.body);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      logger.info(`Project updated successfully: ${req.params.id}`);
      res.json(project);
    } catch (error) {
      logger.error(`Error updating project ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to update project" });
    }
  }
);

// Delete project
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const success = await projectModel.deleteProject(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Project not found" });
    }
    logger.info(`Project deleted successfully: ${req.params.id}`);
    res.status(204).send();
  } catch (error) {
    logger.error(`Error deleting project ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// Update project status
router.post(
  "/:id/status",
  [verifyToken, ...updateProjectStatusSchema, validateResults],
  async (req, res) => {
    const { status, success } = req.body;

    try {
      const project = await projectModel.updateProjectStatus(
        req.params.id,
        status,
        success
      );
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      logger.info(`Project status updated successfully: ${req.params.id}`);
      res.json(project);
    } catch (error) {
      logger.error(`Error updating project status ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to update project status" });
    }
  }
);

module.exports = router;