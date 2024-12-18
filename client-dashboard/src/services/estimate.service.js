import api from "./api";

const estimateService = {
  // Get tasks by project ID
  getTasksByProjectId: async (projectId) => {
    try {
      const response = await api.get(`/dev/getTasksByProjectId/${projectId}`);
      return response.data.tasks;
    } catch (error) {
      console.error("Error fetching project tasks:", error);
      throw error;
    }
  },

  // Get all unique states
  getStates: async () => {
    try {
      const response = await api.get("/dev/getStates");
      return response.data.states;
    } catch (error) {
      console.error("Error fetching states:", error);
      throw error;
    }
  },

  // Get cities in a state
  getCitiesInState: async (stateName) => {
    try {
      const response = await api.get(
        `/dev/getCitiesInStates?stateName=${encodeURIComponent(stateName)}`
      );
      return response.data.cities;
    } catch (error) {
      console.error("Error fetching cities:", error);
      throw error;
    }
  },

  // Get query IDs based on filters
  getQueryIds: async (scrapingMode, filter) => {
    try {
      const response = await api.post("/dev/getQueryIds", {
        scrapingMode,
        filter,
      });
      return response.data.ids;
    } catch (error) {
      console.error("Error fetching query IDs:", error);
      throw error;
    }
  },

  // Start scraping tasks with query distribution
  startScraping: async (taskCount, queryList, startDate) => {
    try {
      const response = await api.post("/dev/startScraping", {
        taskCount: parseInt(taskCount, 10),
        queryList,
        startDate: startDate.toISOString(),
      });
      return response.data;
    } catch (error) {
      console.error("Error starting scraping tasks:", error);
      throw error;
    }
  },

  // Get task performance metrics
  getTaskPerformance: async (startTime, endTime) => {
    try {
      const params = new URLSearchParams();
      if (startTime) {
        params.append('startTime', startTime.toISOString());
      }
      if (endTime) {
        params.append('endTime', endTime.toISOString());
      }

      const response = await api.get(`/dev/taskPerformance?${params.toString()}`);

      // Transform the data to match the expected format
      if (response.data.data) {
        return response.data.data.map(task => ({
          taskId: task.taskId,
          taskArn: task.taskArn,
          status: task.status,
          startedAt: task.startedAt,
          stoppedAt: task.stoppedAt,
          cpu: {
            current: task.cpu?.current || 0,
            history: task.cpu?.history?.map(point => ({
              value: point.value || 0,
              timestamp: point.timestamp
            })) || []
          },
          memory: {
            current: task.memory?.current || 0,
            history: task.memory?.history?.map(point => ({
              value: point.value || 0,
              timestamp: point.timestamp
            })) || []
          },
          containers: task.containers?.map(container => ({
            name: container.name,
            lastStatus: container.lastStatus,
            image: container.image,
            cpu: container.cpu,
            memory: container.memory
          })) || []
        }));
      }
      return [];
    } catch (error) {
      console.error("Error fetching task performance:", error);
      throw error;
    }
  },

  // Poll task performance metrics (for real-time updates)
  pollTaskPerformance: (callback, interval = 30000) => {
    const poll = async () => {
      try {
        // Get last hour of metrics by default
        const endTime = new Date();
        const startTime = new Date(endTime - 3600000); // 1 hour ago
        const data = await estimateService.getTaskPerformance(startTime, endTime);
        callback(data);
      } catch (error) {
        console.error("Error polling task performance:", error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    const pollInterval = setInterval(poll, interval);

    // Return cleanup function
    return () => clearInterval(pollInterval);
  },

  // Get task logs
  getTaskLogs: async (taskId, startTime, endTime) => {
    try {
      const params = new URLSearchParams();
      params.append('taskId', taskId);
      if (startTime) {
        params.append('startTime', startTime.toISOString());
      }
      if (endTime) {
        params.append('endTime', endTime.toISOString());
      }

      const response = await api.get(`/dev/taskLogs?${params.toString()}`);
      return response.data.logs;
    } catch (error) {
      console.error("Error fetching task logs:", error);
      throw error;
    }
  },

  // Start task
  startTask: async (taskId, projectId) => {
    try {
      const response = await api.post("/dev/startTask", { taskId, projectId });
      return response.data;
    } catch (error) {
      console.error("Error starting task:", error);
      throw error;
    }
  },

  // Stop task
  stopTask: async (taskId, projectId) => {
    try {
      const response = await api.post(`/dev/stopTask`, { taskId, projectId });
      return response.data;
    } catch (error) {
      console.error("Error stopping task:", error);
      throw error;
    }
  },

  // Restart task
  restartTask: async (taskId, projectId) => {
    try {
      const response = await api.post(`/dev/restartTask`, { taskId, projectId });
      return response.data;
    } catch (error) {
      console.error("Error restarting task:", error);
      throw error;
    }
  }
};

export default estimateService;