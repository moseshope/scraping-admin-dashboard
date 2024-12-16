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

  // Fetch task performance data
  useEffect(() => {
    const cleanup = estimateService.pollTaskPerformance((data) => {
      // Transform task data for the table
      const transformedTasks = data.map(task => ({
        id: task.taskId,
        name: `Task-${task.taskId.slice(-6)}`,
        cpuPerformance: task.cpu.utilization[task.cpu.utilization.length - 1] || 0,
        memoryPerformance: task.memory.utilization[task.memory.utilization.length - 1] || 0,
        status: task.status.toLowerCase(),
        startedAt: task.startedAt,
        stoppedAt: task.stoppedAt,
        rawData: task // Keep raw data for chart
      }));
      setTasks(transformedTasks);

      // If a task is selected, update its performance data
      if (selectedTask) {
        const selectedTaskData = data.find(t => t.taskId === selectedTask.id);
        if (selectedTaskData) {
          const chartData = selectedTaskData.cpu.timestamp.map((time, index) => ({
            time: new Date(time).toLocaleTimeString(),
            cpu: selectedTaskData.cpu.utilization[index] || 0,
            memory: selectedTaskData.memory.utilization[index] || 0,
          }));
          setPerformanceData(chartData);
        }
      }
    });

    return cleanup;
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
            >
              Stop
            </Button>
          ) : (
            <Button
              startIcon={<PlayArrowIcon />}
              color="success"
              onClick={() => handleStart(params.row.id)}
            >
              Start
            </Button>
          )}
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => handleRestart(params.row.id)}
          >
            Restart
          </Button>
        </ButtonGroup>
      ),
    },
  ];

  const handleStart = (taskId) => {
    console.log('Starting task:', taskId);
  };

  const handleStop = (taskId) => {
    console.log('Stopping task:', taskId);
  };

  const handleRestart = (taskId) => {
    console.log('Restarting task:', taskId);
  };

  const handleRowClick = (params) => {
    setSelectedTask(params.row);
    if (params.row.rawData) {
      const chartData = params.row.rawData.cpu.timestamp.map((time, index) => ({
        time: new Date(time).toLocaleTimeString(),
        cpu: params.row.rawData.cpu.utilization[index] || 0,
        memory: params.row.rawData.memory.utilization[index] || 0,
      }));
      setPerformanceData(chartData);
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
          <Typography variant="h6" gutterBottom>
            ECS Tasks
          </Typography>
          <div style={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={tasks}
              columns={columns}
              pageSize={5}
              rowsPerPageOptions={[5]}
              onRowClick={handleRowClick}
              disableSelectionOnClick
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
      </Container>
    </Box>
  );
};

export default ProjectDetail;