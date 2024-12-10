import api from "./api";

const estimateService = {
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
};

export default estimateService;
