import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
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
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Search as SearchIcon,
} from '@mui/icons-material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

// Sample data for states and their cities
const statesWithCities = {
  'California': ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento'],
  'New York': ['New York City', 'Buffalo', 'Rochester', 'Syracuse', 'Albany'],
  'Texas': ['Houston', 'Austin', 'Dallas', 'San Antonio', 'Fort Worth'],
  'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Tallahassee'],
};

const states = Object.keys(statesWithCities);

const businessTypes = [
  'Restaurant',
  'Retail',
  'Healthcare',
  'Technology',
  'Education',
  'Manufacturing',
  'Construction',
  'Real Estate',
  'Financial Services',
  'Professional Services'
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

  const [availableCities, setAvailableCities] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [businessTypeSelections, setBusinessTypeSelections] = useState({});
  const [expandedCities, setExpandedCities] = useState({});

  // Calculate query count based on selections
  const queryCount = formData.entireScraping 
    ? businessTypes.length 
    : selectedCities.reduce((total, city) => {
        const cityTypes = businessTypeSelections[city] || ['All'];
        return total + (cityTypes.includes('All') ? businessTypes.length : cityTypes.length);
      }, 0);

  useEffect(() => {
    const newAvailableCities = formData.selectedStates.reduce((acc, state) => {
      return [...acc, ...statesWithCities[state]];
    }, []);
    setAvailableCities([...new Set(newAvailableCities)]);
  }, [formData.selectedStates]);

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
        [city]: newCityTypes.length > 0 ? newCityTypes : ['All'],
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

  const handleSubmit = () => {
    const finalData = {
      ...formData,
      queryCount,
      cities: selectedCities.length > 0 ? selectedCities : ['All'],
      businessTypes: Object.fromEntries(
        selectedCities.map(city => [
          city,
          businessTypeSelections[city] || ['All']
        ])
      ),
    };
    onSubmit(finalData);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Create New Project</DialogTitle>
      <DialogContent>
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
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="States"
                      placeholder="Search and select states..."
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
              value={queryCount}
              InputProps={{
                readOnly: true,
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
            !formData.projectName || 
            (!formData.entireScraping && formData.selectedStates.length === 0) ||
            !formData.taskCount ||
            queryCount === 0
          }
        >
          Create Project
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewProjectModal;