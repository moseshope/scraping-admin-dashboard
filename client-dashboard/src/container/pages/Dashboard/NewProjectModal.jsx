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
  Collapse,
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
  ExpandLess,
  ExpandMore,
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

const CityList = ({
  title,
  cities,
  selectedCities,
  onCityToggle,
  onSelectAll,
  searchable = false,
  businessTypeSelections,
  onBusinessTypeToggle,
  expandedCities,
  onExpandCity,
  isSelectedList = false,
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [businessTypeSearchTerms, setBusinessTypeSearchTerms] = useState({});

  const filteredCities = cities.filter(city =>
    city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExpandClick = (event, city) => {
    event.stopPropagation();
    onExpandCity(city);
  };

  const handleBusinessTypeSearch = (city, term) => {
    setBusinessTypeSearchTerms(prev => ({
      ...prev,
      [city]: term,
    }));
  };

  const getFilteredBusinessTypes = (city) => {
    const searchTerm = businessTypeSearchTerms[city] || '';
    return businessTypes.filter(type =>
      type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const isAllSelected = cities.length > 0 && cities.every(city => selectedCities.includes(city));
  const isSomeSelected = cities.length > 0 && cities.some(city => selectedCities.includes(city));

  if (loading) {
    return (
      <Paper sx={{ height: '100%', minHeight: 400, maxHeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <Paper sx={{ height: '100%', minHeight: 400, maxHeight: 600, overflow: 'auto' }}>
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
              placeholder="Search cities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <IconButton sx={{ p: '10px' }}>
              <SearchIcon />
            </IconButton>
          </Paper>
        )}
        <List>
          {!isSelectedList && (
            <>
              <ListItem button onClick={onSelectAll}>
                <ListItemIcon>
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={!isAllSelected && isSomeSelected}
                  />
                </ListItemIcon>
                <ListItemText primary="Select All Cities" />
              </ListItem>
              <Divider />
            </>
          )}
          {filteredCities.map((city) => (
            <React.Fragment key={city}>
              <ListItem button onClick={() => onCityToggle(city)}>
                <ListItemIcon>
                  <Checkbox checked={selectedCities.includes(city)} />
                </ListItemIcon>
                <ListItemText primary={city} />
                {isSelectedList && (
                  <IconButton onClick={(e) => handleExpandClick(e, city)}>
                    {expandedCities[city] ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                )}
              </ListItem>
              {isSelectedList && (
                <Collapse in={expandedCities[city]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    <ListItem sx={{ pl: 4 }}>
                      <Paper
                        sx={{
                          p: '2px 4px',
                          display: 'flex',
                          alignItems: 'center',
                          width: '100%',
                          mb: 1,
                        }}
                      >
                        <InputBase
                          sx={{ ml: 1, flex: 1 }}
                          placeholder="Search business types..."
                          value={businessTypeSearchTerms[city] || ''}
                          onChange={(e) => handleBusinessTypeSearch(city, e.target.value)}
                        />
                        <IconButton sx={{ p: '10px' }}>
                          <SearchIcon />
                        </IconButton>
                      </Paper>
                    </ListItem>
                    {getFilteredBusinessTypes(city).map((type) => (
                      <ListItem
                        key={`${city}-${type}`}
                        button
                        sx={{ pl: 6 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onBusinessTypeToggle(city, type);
                        }}
                      >
                        <ListItemIcon>
                          <Checkbox
                            checked={(businessTypeSelections[city] || []).includes(type)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </ListItemIcon>
                        <ListItemText primary={type} />
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              )}
            </React.Fragment>
          ))}
        </List>
      </Box>
    </Paper>
  );
};

const NewProjectModal = ({ open, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    projectName: '',
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
  const [businessTypeSelections, setBusinessTypeSelections] = useState({});
  const [expandedCities, setExpandedCities] = useState({});
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
          const filter = formData.selectedStates.map((state) => {
            if (selectedCities.length === 0) {
              // State-only selection
              return { 
                state, 
                filters: [{ city: 'All' }] 
              };
            } else {
              // State and city selection
              const cityFilters = selectedCities.map((city) => {
                const chosenTypes = businessTypeSelections[city];
                if (chosenTypes && chosenTypes.length > 0 && !chosenTypes.includes('All')) {
                  return { city, businessType: chosenTypes };
                } else {
                  return { city };
                }
              });
              return { state, filters: cityFilters };
            }
          });
  
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
    businessTypeSelections
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
      setBusinessTypeSelections({});
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
    // Reset cities and business types when states change
    setSelectedCities([]);
    setBusinessTypeSelections({});
  };

  const handleCityToggle = (city) => {
    setSelectedCities(prev => {
      if (prev.includes(city)) {
        // Remove city and its business type selections
        const newBusinessTypes = { ...businessTypeSelections };
        delete newBusinessTypes[city];
        setBusinessTypeSelections(newBusinessTypes);
        return prev.filter(c => c !== city);
      } else {
        return [...prev, city];
      }
    });
  };

  const handleCitySelectAll = () => {
    const availableCitiesSet = new Set(availableCities);
    const newSelectedCities = selectedCities.filter(city => !availableCitiesSet.has(city));
    
    if (availableCities.every(city => selectedCities.includes(city))) {
      // If all cities are selected, unselect them
      setSelectedCities(newSelectedCities);
      // Clear business type selections for unselected cities
      const newBusinessTypes = { ...businessTypeSelections };
      availableCities.forEach(city => delete newBusinessTypes[city]);
      setBusinessTypeSelections(newBusinessTypes);
    } else {
      // Select all available cities
      setSelectedCities([...newSelectedCities, ...availableCities]);
    }
  };

  const handleBusinessTypeToggle = (city, type) => {
    setBusinessTypeSelections(prev => {
      const cityTypes = prev[city] || [];
      const newCityTypes = cityTypes.includes(type)
        ? cityTypes.filter(t => t !== type)
        : [...cityTypes, type];
      
      return {
        ...prev,
        [city]: newCityTypes,
      };
    });
  };

  const handleExpandCity = (city) => {
    setExpandedCities(prev => ({
      ...prev,
      [city]: !prev[city],
    }));
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

      // Start scraping tasks with the query list
      const scrapingResult = await estimateService.startScraping(
        formData.taskCount,
        queryIds,
        formData.startDate.toDate()
      );

      const finalData = {
        ...formData,
        queryCount,
        cities: selectedCities.length > 0 ? selectedCities : [],
        businessTypes: Object.fromEntries(
          selectedCities.map(city => [
            city,
            businessTypeSelections[city] || []
          ])
        ),
        scrapingTasks: scrapingResult.tasks
      };

      onSubmit(finalData);
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
              name="projectName"
              label="Project Name"
              fullWidth
              value={formData.projectName}
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
                <Grid item xs={12}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <CityList
                        title="Available Cities"
                        cities={availableCities.filter(city => !selectedCities.includes(city))}
                        selectedCities={selectedCities}
                        onCityToggle={handleCityToggle}
                        onSelectAll={handleCitySelectAll}
                        searchable={true}
                        loading={citiesLoading}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <CityList
                        title="Selected Cities"
                        cities={selectedCities}
                        selectedCities={selectedCities}
                        onCityToggle={handleCityToggle}
                        searchable={true}
                        businessTypeSelections={businessTypeSelections}
                        onBusinessTypeToggle={handleBusinessTypeToggle}
                        expandedCities={expandedCities}
                        onExpandCity={handleExpandCity}
                        isSelectedList={true}
                        loading={citiesLoading}
                      />
                    </Grid>
                  </Grid>
                </Grid>
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
            !formData.projectName || 
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