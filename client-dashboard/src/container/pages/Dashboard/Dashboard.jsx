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

// Sample data
const rows = [
  { id: 1, name: 'Project 1', status: 'Active', lastRun: '2024-02-20', success: 15, failed: 2 },
  { id: 2, name: 'Project 2', status: 'Paused', lastRun: '2024-02-19', success: 25, failed: 1 },
  { id: 3, name: 'Project 3', status: 'Active', lastRun: '2024-02-18', success: 10, failed: 0 },
  { id: 4, name: 'Project 4', status: 'Completed', lastRun: '2024-02-17', success: 30, failed: 3 },
  { id: 5, name: 'Project 5', status: 'Active', lastRun: '2024-02-16', success: 20, failed: 1 },
];

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
      await dispatch(createProject(projectData)).unwrap();
      setIsNewProjectModalOpen(false);
      // Refresh the projects list
      dispatch(fetchProjects());
    } catch (error) {
      console.error('Failed to create project:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleRowClick = (params) => {
    navigate(`/dashboard/projects/${params.row.id}`);
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'name', headerName: 'Project Name', width: 200 },
    { field: 'status', headerName: 'Status', width: 130 },
    { field: 'lastRun', headerName: 'Last Run', width: 130 },
    { field: 'success', headerName: 'Successful Runs', width: 150 },
    { field: 'failed', headerName: 'Failed Runs', width: 130 },
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
              rows={projects.length > 0 ? projects : rows}
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