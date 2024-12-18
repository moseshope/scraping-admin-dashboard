import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  ButtonGroup,
  IconButton,
  Toolbar,
  AppBar,
  Alert,
  Snackbar,
} from '@mui/material';
import { DataGrid, gridClasses } from '@mui/x-data-grid';
import {
  ArrowBack as ArrowBackIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import estimateService from '../../../services/estimate.service';
import { useDispatch } from 'react-redux';
import { fetchProjects } from '../../../redux/slices/projectsSlice';

const ProjectDetail = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id: projectId } = useParams();
  const [selectedTask, setSelectedTask] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const getStatusColor = (status) => {
    const normalizedStatus = status?.toUpperCase();
    switch (normalizedStatus) {
      case 'RUNNING':
        return '#4caf50'; // Green
      case 'PROVISIONING':
        return '#ff9800'; // Orange
      case 'STOPPED':
        return '#2196f3'; // Blue
      case 'FAILED':
        return '#f44336'; // Red
      case 'SUCCESSFUL':
        return '#81c784'; // Light Green
      default:
        return '#9e9e9e'; // Grey
    }
  };

  const renderActionButtons = (status, taskId) => {
    const normalizedStatus = status?.toUpperCase();
    switch (normalizedStatus) {
      case 'RUNNING':
        return (
          <ButtonGroup variant="contained" size="small">
            <Button
              startIcon={<StopIcon />}
              color="error"
              onClick={() => handleStop(taskId)}
              disabled={actionLoading}
            >
              Stop
            </Button>
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => handleRestart(taskId)}
              disabled={actionLoading}
              color="primary"
            >
              Restart
            </Button>
          </ButtonGroup>
        );
      case 'STOPPED':
      case 'FAILED':
        return (
          <ButtonGroup variant="contained" size="small">
            <Button
              startIcon={<PlayArrowIcon />}
              color="success"
              onClick={() => handleStart(taskId)}
              disabled={actionLoading}
            >
              Start
            </Button>
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => handleRestart(taskId)}
              disabled={actionLoading}
              color="primary"
            >
              Restart
            </Button>
          </ButtonGroup>
        );
      case 'SUCCESSFUL':
      case 'PROVISIONING':
        return null;
      default:
        return null;
    }
  };

  const updateTasksAndPerformance = async () => {
    try {
      // Get tasks from project
      const projectTasks = await estimateService.getTasksByProjectId(projectId);
      
      // Get performance data for tasks
      const performanceData = await estimateService.getTaskPerformance();
      
      // Combine task data with performance metrics
      const updatedTasks = projectTasks.map(task => {
        const taskPerformance = performanceData.find(p => p.taskArn === task.taskArn);
        return {
          id: task.taskArn,
          name: `Task-${task.taskArn.slice(-6)}`,
          cpuPerformance: taskPerformance?.cpu.current || 0,
          memoryPerformance: taskPerformance?.memory.current || 0,
          status: task.lastStatus,
          startedAt: task.startedAt,
          taskArn: task.taskArn,
          rawData: taskPerformance
        };
      });

      setTasks(updatedTasks);

      // Update selected task performance data if one is selected
      if (selectedTask) {
        const selectedTaskData = performanceData.find(t => t.taskArn === selectedTask.taskArn);
        if (selectedTaskData) {
          const chartData = selectedTaskData.cpu.history.map((cpuPoint, index) => ({
            time: new Date(cpuPoint.timestamp).toLocaleTimeString(),
            cpu: cpuPoint.value,
            memory: selectedTaskData.memory.history[index]?.value || 0,
          }));
          setPerformanceData(chartData);
        }
      }

      // Update project status in Dashboard
      dispatch(fetchProjects());
    } catch (error) {
      console.error('Error updating tasks:', error);
      showNotification('Failed to update task data', 'error');
    }
  };

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        await updateTasksAndPerformance();
      } catch (error) {
        console.error('Error fetching initial data:', error);
        showNotification('Failed to fetch initial data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [projectId]); // Only fetch on component mount and projectId change

  const columns = [
    { field: 'name', headerName: 'Task Name', width: 200 },
    {
      field: 'cpuPerformance',
      headerName: 'CPU Usage',
      width: 150,
      valueFormatter: (params) => `${params.value.toFixed(2)}%`,
    },
    {
      field: 'memoryPerformance',
      headerName: 'Memory Usage',
      width: 150,
      valueFormatter: (params) => `${params.value.toFixed(2)}%`,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <Box
          sx={{
            backgroundColor: getStatusColor(params.value),
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            textTransform: 'uppercase',
          }}
        >
          {params.value}
        </Box>
      ),
    },
    {
      field: 'startedAt',
      headerName: 'Started At',
      width: 200,
      valueFormatter: (params) => 
        params.value ? new Date(params.value).toLocaleString() : 'N/A',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      renderCell: (params) => renderActionButtons(params.row.status, params.row.taskArn),
    },
  ];

  const handleStart = async (taskId) => {
    try {
      setActionLoading(true);
      await estimateService.startTask(taskId, projectId);
      showNotification('Task started successfully', 'success');
      await updateTasksAndPerformance();
    } catch (error) {
      console.error('Error starting task:', error);
      showNotification('Failed to start task', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async (taskId) => {
    try {
      setActionLoading(true);
      await estimateService.stopTask(taskId, projectId);
      showNotification('Task stopped successfully', 'success');
      await updateTasksAndPerformance();
    } catch (error) {
      console.error('Error stopping task:', error);
      showNotification('Failed to stop task', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestart = async (taskId) => {
    try {
      setActionLoading(true);
      await estimateService.restartTask(taskId, projectId);
      showNotification('Task restarted successfully', 'success');
      await updateTasksAndPerformance();
    } catch (error) {
      console.error('Error restarting task:', error);
      showNotification('Failed to restart task', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRowClick = (params) => {
    setSelectedTask(params.row);
    if (params.row.rawData) {
      const chartData = params.row.rawData.cpu.history.map((cpuPoint, index) => ({
        time: new Date(cpuPoint.timestamp).toLocaleTimeString(),
        cpu: cpuPoint.value,
        memory: params.row.rawData.memory.history[index]?.value || 0,
      }));
      setPerformanceData(chartData);
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await updateTasksAndPerformance();
      showNotification('Data refreshed successfully', 'success');
    } catch (error) {
      console.error('Error refreshing data:', error);
      showNotification('Failed to refresh data', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Project Details - {projectId}
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 2, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              ECS Tasks
            </Typography>
            <IconButton onClick={handleRefresh} disabled={loading || actionLoading}>
              <RefreshIcon />
            </IconButton>
          </Box>
          <div style={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={tasks}
              columns={columns}
              pageSize={5}
              rowsPerPageOptions={[5]}
              onRowClick={handleRowClick}
              disableSelectionOnClick
              loading={loading || actionLoading}
              sx={{
                [`& .${gridClasses.row}`]: {
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                },
              }}
            />
          </div>
        </Paper>

        {selectedTask && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Performance Metrics - {selectedTask.name}
            </Typography>
            <Box sx={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    label={{
                      value: 'Usage (%)',
                      angle: -90,
                      position: 'insideLeft',
                    }}
                    domain={[0, 100]}
                  />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="cpu"
                    name="CPU Usage"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="memory"
                    name="Memory Usage"
                    stroke="#82ca9d"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        )}

        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={handleCloseNotification}
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default ProjectDetail;