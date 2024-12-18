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

const ProjectDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
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

  // Fetch task performance data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await estimateService.getTaskPerformance();
        console.log('Raw performance data:', data);
        
        // Transform task data for the table
        const transformedTasks = data.map(task => ({
          id: task.taskId,
          name: `Task-${task.taskId.slice(-6)}`,
          cpuPerformance: task.cpu.current || 0,
          memoryPerformance: task.memory.current || 0,
          status: task.status.toLowerCase(),
          startedAt: task.startedAt,
          rawData: task // Keep raw data for chart
        }));
        setTasks(transformedTasks);

        // If a task is selected, update its performance data
        if (selectedTask) {
          const selectedTaskData = data.find(t => t.taskId === selectedTask.id);
          if (selectedTaskData) {
            console.log('Selected task performance data:', selectedTaskData);
            const chartData = selectedTaskData.cpu.history.map((cpuPoint, index) => ({
              time: new Date(cpuPoint.timestamp).toLocaleTimeString(),
              cpu: cpuPoint.value,
              memory: selectedTaskData.memory.history[index]?.value || 0,
            }));
            setPerformanceData(chartData);
          }
        }
      } catch (error) {
        console.error('Error fetching task performance:', error);
        showNotification('Failed to fetch task performance data', 'error');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up polling
    const interval = setInterval(fetchData, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [selectedTask]);

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
            backgroundColor:
              params.value === 'running'
                ? 'success.main'
                : params.value === 'pending'
                ? 'warning.main'
                : 'error.main',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            textTransform: 'capitalize',
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
      renderCell: (params) => (
        <ButtonGroup variant="contained" size="small">
          {params.row.status === 'running' ? (
            <Button
              startIcon={<StopIcon />}
              color="error"
              onClick={() => handleStop(params.row.id)}
              disabled={actionLoading}
            >
              Stop
            </Button>
          ) : (
            <Button
              startIcon={<PlayArrowIcon />}
              color="success"
              onClick={() => handleStart(params.row.id)}
              disabled={actionLoading}
            >
              Start
            </Button>
          )}
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => handleRestart(params.row.id)}
            disabled={actionLoading}
          >
            Restart
          </Button>
        </ButtonGroup>
      ),
    },
  ];

  const handleStart = async (taskId) => {
    try {
      setActionLoading(true);
      await estimateService.startTask(taskId);
      showNotification('Task started successfully', 'success');
      // Refresh data
      const data = await estimateService.getTaskPerformance();
      const transformedTasks = data.map(task => ({
        id: task.taskId,
        name: `Task-${task.taskId.slice(-6)}`,
        cpuPerformance: task.cpu.current || 0,
        memoryPerformance: task.memory.current || 0,
        status: task.status.toLowerCase(),
        startedAt: task.startedAt,
        rawData: task
      }));
      setTasks(transformedTasks);
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
      await estimateService.stopTask(taskId);
      showNotification('Task stopped successfully', 'success');
      // Refresh data
      const data = await estimateService.getTaskPerformance();
      const transformedTasks = data.map(task => ({
        id: task.taskId,
        name: `Task-${task.taskId.slice(-6)}`,
        cpuPerformance: task.cpu.current || 0,
        memoryPerformance: task.memory.current || 0,
        status: task.status.toLowerCase(),
        startedAt: task.startedAt,
        rawData: task
      }));
      setTasks(transformedTasks);
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
      await estimateService.restartTask(taskId);
      showNotification('Task restarted successfully', 'success');
      // Refresh data
      const data = await estimateService.getTaskPerformance();
      const transformedTasks = data.map(task => ({
        id: task.taskId,
        name: `Task-${task.taskId.slice(-6)}`,
        cpuPerformance: task.cpu.current || 0,
        memoryPerformance: task.memory.current || 0,
        status: task.status.toLowerCase(),
        startedAt: task.startedAt,
        rawData: task
      }));
      setTasks(transformedTasks);
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
      console.log('Selected task raw data:', params.row.rawData);
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
      const data = await estimateService.getTaskPerformance();
      const transformedTasks = data.map(task => ({
        id: task.taskId,
        name: `Task-${task.taskId.slice(-6)}`,
        cpuPerformance: task.cpu.current || 0,
        memoryPerformance: task.memory.current || 0,
        status: task.status.toLowerCase(),
        startedAt: task.startedAt,
        rawData: task
      }));
      setTasks(transformedTasks);
      setSelectedTask(null);
      setPerformanceData([]);
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
            Project Details - {id}
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