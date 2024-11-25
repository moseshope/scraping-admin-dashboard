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

// Sample data for instances
const sampleInstances = [
  {
    id: 1,
    name: 'Instance-1',
    cpuPerformance: 45,
    memoryPerformance: 60,
    status: 'running',
  },
  {
    id: 2,
    name: 'Instance-2',
    cpuPerformance: 30,
    memoryPerformance: 45,
    status: 'stopped',
  },
  {
    id: 3,
    name: 'Instance-3',
    cpuPerformance: 75,
    memoryPerformance: 80,
    status: 'running',
  },
];

// Sample performance data for charts
const generatePerformanceData = () => {
  const data = [];
  for (let i = 0; i < 20; i++) {
    data.push({
      time: new Date(Date.now() - (20 - i) * 60000).toLocaleTimeString(),
      cpu: Math.floor(Math.random() * 100),
      memory: Math.floor(Math.random() * 100),
    });
  }
  return data;
};

const ProjectDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [performanceData, setPerformanceData] = useState(generatePerformanceData());

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPerformanceData(prevData => {
        const newData = [...prevData.slice(1)];
        newData.push({
          time: new Date().toLocaleTimeString(),
          cpu: Math.floor(Math.random() * 100),
          memory: Math.floor(Math.random() * 100),
        });
        return newData;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const columns = [
    { field: 'name', headerName: 'Instance Name', width: 200 },
    {
      field: 'cpuPerformance',
      headerName: 'CPU Performance',
      width: 150,
      valueFormatter: (params) => `${params.value}%`,
    },
    {
      field: 'memoryPerformance',
      headerName: 'Memory Performance',
      width: 150,
      valueFormatter: (params) => `${params.value}%`,
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

  const handleStart = (instanceId) => {
    console.log('Starting instance:', instanceId);
  };

  const handleStop = (instanceId) => {
    console.log('Stopping instance:', instanceId);
  };

  const handleRestart = (instanceId) => {
    console.log('Restarting instance:', instanceId);
  };

  const handleRowClick = (params) => {
    setSelectedInstance(params.row);
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
            Instances
          </Typography>
          <div style={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={sampleInstances}
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

        {selectedInstance && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Performance Metrics - {selectedInstance.name}
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