import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  IconButton,
  Box,
  Chip,
  Autocomplete,
  InputBase,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
} from '@mui/icons-material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import estimateService from '../../../services/estimate.service';
import dayjs from 'dayjs';

const businessTypes = [
  'Massage therapist',
  'Caterer',
  'Plasterer',
  'Uniform store',
  'Lawyer',
  'Blood testing service',
  'Taxi service',
  'Gas company',
  'Ballet school',
  'Retirement home'
];

const FilterList = ({
  title,
  items,
  selectedItems,
  onItemToggle,
  onSelectAll,
  searchable = false,
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items.filter(item =>
    item.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAllSelected = items.length > 0 && items.every(item => selectedItems.includes(item));
  const isSomeSelected = items.length > 0 && items.some(item => selectedItems.includes(item));

  if (loading) {
    return (
      <Paper sx={{ height: '100%', minHeight: 300, maxHeight: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <Paper sx={{ height: '100%', minHeight: 300, maxHeight: 400, overflow: 'auto' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        {searchable && (
          <Paper
            sx={{
              p: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              mb: 1,
              position: 'sticky',
              top: 0,
              zIndex: 1,
              backgroundColor: 'background.paper',
            }}
          >
            <InputBase
              sx={{ ml: 1, flex: 1 }}
              placeholder={`Search ${title.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <IconButton sx={{ p: '10px' }}>
              <SearchIcon />
            </IconButton>
          </Paper>
        )}
        <List>
          <ListItem button onClick={onSelectAll}>
            <ListItemIcon>
              <Checkbox
                checked={isAllSelected}
                indeterminate={!isAllSelected && isSomeSelected}
              />
            </ListItemIcon>
            <ListItemText primary={`Select All ${title}`} />
          </ListItem>
          <Divider />
          {filteredItems.map((item) => (
            <ListItem key={item} button onClick={() => onItemToggle(item)}>
              <ListItemIcon>
                <Checkbox checked={selectedItems.includes(item)} />
              </ListItemIcon>
              <ListItemText primary={item} />
            </ListItem>
          ))}
        </List>
      </Box>
    </Paper>
  );
};

const NewProjectModal = ({ open, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    selectedStates: [],
    startDate: null,
    customQuery: '',
    highPriority: false,
    entireScraping: false,
    taskCount: '',
  });

  const [states, setStates] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [queryCount, setQueryCount] = useState(0);
  const [queryCountLoading, setQueryCountLoading] = useState(false);
  const [queryIds, setQueryIds] = useState([]);

  // Fetch states on component mount
  useEffect(() => {
    const fetchStates = async () => {
      try {
        setLoading(true);
        setError(null);
        const statesData = await estimateService.getStates();
        setStates(statesData);
      } catch (err) {
        setError('Failed to fetch states. Please try again.');
        console.error('Error fetching states:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStates();
  }, []);

  // Fetch cities when states are selected
  useEffect(() => {
    const fetchCities = async () => {
      if (!formData.selectedStates.length) {
        setAvailableCities([]);
        return;
      }

      try {
        setCitiesLoading(true);
        setError(null);
        const citiesPromises = formData.selectedStates.map(state => 
          estimateService.getCitiesInState(state)
        );
        const citiesResults = await Promise.all(citiesPromises);
        const allCities = [...new Set(citiesResults.flat())];
        setAvailableCities(allCities);
      } catch (err) {
        setError('Failed to fetch cities. Please try again.');
        console.error('Error fetching cities:', err);
      } finally {
        setCitiesLoading(false);
      }
    };

    fetchCities();
  }, [formData.selectedStates]);

  // Update query count when any filter changes
  useEffect(() => {
    const updateQueryCount = async () => {
      try {
        setQueryCountLoading(true);
        setError(null);
  
        if (formData.entireScraping) {
          // Entire scraping mode (scrapingMode = 0)
          const ids = await estimateService.getQueryIds(0, []);
          setQueryIds(ids);
          setQueryCount(ids.length);
        } else if (formData.selectedStates.length === 0) {
          // No states selected
          setQueryIds([]);
          setQueryCount(0);
        } else {
          // States are selected
          const filter = formData.selectedStates.map((state) => ({
            state,
            filters: {
              cities: selectedCities.length > 0 ? selectedCities : ['All'],
              businessTypes: selectedBusinessTypes.length > 0 ? selectedBusinessTypes : ['All']
            }
          }));
  
          const ids = await estimateService.getQueryIds(1, filter);
          setQueryIds(ids);
          setQueryCount(ids.length);
        }
  
      } catch (err) {
        setError('Failed to update query count. Please try again.');
        console.error('Error updating query count:', err);
      } finally {
        setQueryCountLoading(false);
      }
    };
  
    updateQueryCount();
  }, [
    formData.entireScraping,
    formData.selectedStates,
    selectedCities,
    selectedBusinessTypes
  ]);
  
  const handleChange = (event) => {
    const { name, value, checked } = event.target;
    if (name === 'entireScraping') {
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        selectedStates: checked ? [] : prev.selectedStates,
      }));
      setSelectedCities([]);
      setSelectedBusinessTypes([]);
    } else if (name === 'taskCount') {
      // Only allow positive numbers
      const numValue = value.replace(/[^0-9]/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: numValue,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: event.target.type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleStatesChange = (event, newValue) => {
    setFormData(prev => ({
      ...prev,
      selectedStates: newValue,
    }));
    // Reset cities when states change
    setSelectedCities([]);
  };

  const handleCityToggle = (city) => {
    setSelectedCities(prev => {
      if (prev.includes(city)) {
        return prev.filter(c => c !== city);
      } else {
        return [...prev, city];
      }
    });
  };

  const handleBusinessTypeToggle = (type) => {
    setSelectedBusinessTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const handleCitySelectAll = () => {
    if (availableCities.every(city => selectedCities.includes(city))) {
      setSelectedCities([]);
    } else {
      setSelectedCities([...availableCities]);
    }
  };

  const handleBusinessTypeSelectAll = () => {
    if (businessTypes.every(type => selectedBusinessTypes.includes(type))) {
      setSelectedBusinessTypes([]);
    } else {
      setSelectedBusinessTypes([...businessTypes]);
    }
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      startDate: date,
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if start date is today
      const today = dayjs();
      const startDate = dayjs(formData.startDate);
      const isToday = startDate.format('YYYY-MM-DD') === today.format('YYYY-MM-DD');

      if (!isToday) {
        setError('Start date must be today for immediate task execution');
        return;
      }

      // First start scraping tasks with the query list
      const scrapingResult = await estimateService.startScraping(
        formData.taskCount,
        queryIds,
        formData.startDate.toDate()
      );

      if (!scrapingResult || !scrapingResult.tasks || scrapingResult.tasks.length === 0) {
        throw new Error('No tasks were created from scraping');
      }

      // Create project with scraping result data
      const projectData = {
        name: formData.name, // Changed from projectName to name
        status: 'running',
        settings: {
          entireScraping: formData.entireScraping,
          highPriority: formData.highPriority,
          taskCount: parseInt(formData.taskCount, 10),
          startDate: formData.startDate.toISOString(),
          customQuery: formData.customQuery || '',
        },
        filters: {
          states: formData.selectedStates,
          cities: selectedCities,
          businessTypes: selectedBusinessTypes,
        },
        queryCount: parseInt(queryCount, 10),
        queryIds,
        scrapingTasks: scrapingResult.tasks,
      };

      // Create project and wait for it to complete
      await onSubmit(projectData);
      onClose();
    } catch (err) {
      setError('Failed to create project. Please try again.');
      console.error('Error creating project:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Create New Project</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              name="name"
              label="Project Name"
              fullWidth
              value={formData.name}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.entireScraping}
                  onChange={handleChange}
                  name="entireScraping"
                  color="primary"
                />
              }
              label="Entire Scraping Mode"
            />
          </Grid>

          {!formData.entireScraping && (
            <>
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={states}
                  value={formData.selectedStates}
                  onChange={handleStatesChange}
                  loading={loading}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="States"
                      placeholder="Search and select states..."
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        label={option}
                        {...getTagProps({ index })}
                      />
                    ))
                  }
                />
              </Grid>

              {formData.selectedStates.length > 0 && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Filter Options
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FilterList
                      title="Cities"
                      items={availableCities}
                      selectedItems={selectedCities}
                      onItemToggle={handleCityToggle}
                      onSelectAll={handleCitySelectAll}
                      searchable={true}
                      loading={citiesLoading}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FilterList
                      title="Business Types"
                      items={businessTypes}
                      selectedItems={selectedBusinessTypes}
                      onItemToggle={handleBusinessTypeToggle}
                      onSelectAll={handleBusinessTypeSelectAll}
                      searchable={true}
                    />
                  </Grid>
                </>
              )}
            </>
          )}

          <Grid item xs={12} md={6}>
            <TextField
              label="Selected Query Count"
              type="text"
              fullWidth
              value={queryCountLoading ? 'Calculating...' : queryCount}
              InputProps={{
                readOnly: true,
                endAdornment: queryCountLoading && (
                  <CircularProgress color="inherit" size={20} />
                ),
              }}
              helperText="Total number of queries based on selections"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              name="taskCount"
              label="Task Count"
              type="text"
              fullWidth
              value={formData.taskCount}
              onChange={handleChange}
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
              helperText="Enter the number of tasks to create"
            />
          </Grid>

          <Grid item xs={12}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Start Date"
                value={formData.startDate}
                onChange={handleDateChange}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12}>
            <TextField
              name="customQuery"
              label="Custom Query Parameters"
              fullWidth
              multiline
              rows={3}
              value={formData.customQuery}
              onChange={handleChange}
              helperText="Enter any additional query parameters or settings"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.highPriority}
                  onChange={handleChange}
                  name="highPriority"
                  color="primary"
                />
              }
              label="High Priority"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={
            loading ||
            !formData.name || 
            (!formData.entireScraping && formData.selectedStates.length === 0) ||
            !formData.taskCount ||
            queryCount === 0 ||
            !formData.startDate
          }
        >
          {loading ? <CircularProgress size={24} /> : 'Create Project'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewProjectModal;