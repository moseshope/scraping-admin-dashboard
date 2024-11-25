import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import projectsReducer from './slices/projectsSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    projects: projectsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['projects/createProject/fulfilled'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.startDate', 'payload.endDate'],
        // Ignore these paths in the state
        ignoredPaths: ['projects.projects.startDate', 'projects.projects.endDate'],
      },
    }),
});

export default store;