import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  IconButton,
  Toolbar,
  AppBar,
  Menu,
  MenuItem,
  Button,
  Chip,
} from '@mui/material';
import { DataGrid, gridClasses } from '@mui/x-data-grid';
import {
  AccountCircle,
  Refresh as RefreshIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../../redux/slices/authSlice';
import { createProject, fetchProjects, selectProjects, selectProjectsLoading } from '../../../redux/slices/projectsSlice';
import NewProjectModal from './NewProjectModal';

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  const projects = useSelector(selectProjects);
  const loading = useSelector(selectProjectsLoading);

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if the API call fails, we should still clear local state and redirect
      navigate('/login', { replace: true });
    }
    handleClose();
  };

  const handleRefresh = () => {
    dispatch(fetchProjects());
  };

  const handleAddNew = () => {
    setIsNewProjectModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsNewProjectModalOpen(false);
  };

  const handleCreateProject = async (projectData) => {
    try {
      const result = await dispatch(createProject(projectData)).unwrap();
      setIsNewProjectModalOpen(false);
      dispatch(fetchProjects());
      return result;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  };

  const handleRowClick = (params) => {
    navigate(`/dashboard/projects/${params.row.id}`);
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

  const columns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'name', headerName: 'Project Name', width: 200 },
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
      )
    },
    { 
      field: 'settings', 
      headerName: 'Task Count', 
      width: 100,
      valueGetter: (params) => params.row.settings?.taskCount || 0
    },
    { 
      field: 'queryCount', 
      headerName: 'Total Queries', 
      width: 120,
      valueGetter: (params) => params.row.queryCount || 0
    },
    {
      field: 'runningTasks',
      headerName: 'Running Tasks',
      width: 120,
      valueGetter: (params) => 
        params.row.scrapingTasks?.filter(task => 
          task.lastStatus === "Running"
        ).length || 0
    },
    {
      field: 'completedTasks',
      headerName: 'Completed Tasks',
      width: 130,
      valueGetter: (params) => 
        params.row.scrapingTasks?.filter(task => 
          task.lastStatus === "Successful"
        ).length || 0
    },
    {
      field: 'failedTasks',
      headerName: 'Failed Tasks',
      width: 100,
      valueGetter: (params) => 
        params.row.scrapingTasks?.filter(task => 
          task.lastStatus === "Failed"
        ).length || 0
    },
    {
      field: 'updatedAt',
      headerName: 'Last Updated',
      width: 180,
      valueFormatter: (params) => 
        params.value ? new Date(params.value).toLocaleString() : 'N/A'
    },
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Scraping Dashboard
          </Typography>
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <AccountCircle />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleClose}>Profile</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              Scraping Projects
            </Typography>
            <Box>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={handleAddNew}
                sx={{ mr: 1 }}
              >
                New Project
              </Button>
              <IconButton onClick={handleRefresh} color="primary">
                <RefreshIcon />
              </IconButton>
            </Box>
          </Box>
          
          <div style={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={projects}
              columns={columns}
              pageSize={5}
              rowsPerPageOptions={[5]}
              checkboxSelection
              disableSelectionOnClick
              loading={loading}
              onRowClick={handleRowClick}
              onSelectionModelChange={(newSelection) => {
                setSelectedRows(newSelection);
              }}
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
      </Container>

      <NewProjectModal
        open={isNewProjectModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleCreateProject}
      />
    </Box>
  );
};

export default Dashboard;