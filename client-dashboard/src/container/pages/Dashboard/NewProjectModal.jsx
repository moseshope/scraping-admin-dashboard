import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Grid,
  Checkbox,
  ListItemText,
  OutlinedInput,
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

// Sample data for states and their cities
const statesWithCities = {
  'California': ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento'],
  'New York': ['New York City', 'Buffalo', 'Rochester', 'Syracuse', 'Albany'],
  'Texas': ['Houston', 'Austin', 'Dallas', 'San Antonio', 'Fort Worth'],
  'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Tallahassee'],
  // Add more states and cities as needed
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

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const NewProjectModal = ({ open, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    projectName: '',
    state: '',
    cities: [],
    businessTypes: [],
    startDate: null,
    customQuery: '',
    highPriority: false,
    entireScraping: false,
  });

  const [availableCities, setAvailableCities] = useState([]);

  useEffect(() => {
    if (formData.state) {
      setAvailableCities(statesWithCities[formData.state] || []);
      // Reset cities selection when state changes
      setFormData(prev => ({
        ...prev,
        cities: [],
      }));
    }
  }, [formData.state]);

  const handleChange = (event) => {
    const { name, value, checked } = event.target;
    if (name === 'entireScraping') {
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        // Reset location-specific fields if switching to entire scraping
        ...(checked ? {
          state: '',
          cities: [],
          businessTypes: [],
        } : {}),
      }));
    } else if (name === 'cities') {
      const selectedCities = typeof value === 'string' ? value.split(',') : value;
      
      // Handle "Select All" option
      if (selectedCities.includes('all')) {
        if (selectedCities.length === 1) {
          // If only "Select All" is selected, select all cities
          setFormData(prev => ({
            ...prev,
            cities: availableCities,
          }));
        } else {
          // If "Select All" is unselected, clear selection
          setFormData(prev => ({
            ...prev,
            cities: [],
          }));
        }
      } else {
        setFormData(prev => ({
          ...prev,
          cities: selectedCities,
        }));
      }
    } else if (name === 'businessTypes') {
      const selectedTypes = typeof value === 'string' ? value.split(',') : value;
      
      // Handle "Select All" option
      if (selectedTypes.includes('all')) {
        if (selectedTypes.length === 1) {
          // If only "Select All" is selected, select all business types
          setFormData(prev => ({
            ...prev,
            businessTypes: businessTypes,
          }));
        } else {
          // If "Select All" is unselected, clear selection
          setFormData(prev => ({
            ...prev,
            businessTypes: [],
          }));
        }
      } else {
        setFormData(prev => ({
          ...prev,
          businessTypes: selectedTypes,
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: event.target.type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      startDate: date,
    }));
  };

  const handleSubmit = () => {
    onSubmit(formData);
    onClose();
  };

  const isFieldDisabled = formData.entireScraping;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
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

          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={isFieldDisabled}>
              <InputLabel>State</InputLabel>
              <Select
                name="state"
                value={formData.state}
                label="State"
                onChange={handleChange}
              >
                {states.map(state => (
                  <MenuItem key={state} value={state}>{state}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={isFieldDisabled || !formData.state}>
              <InputLabel>Cities</InputLabel>
              <Select
                name="cities"
                multiple
                value={formData.cities}
                onChange={handleChange}
                input={<OutlinedInput label="Cities" />}
                renderValue={(selected) => selected.join(', ')}
                MenuProps={MenuProps}
              >
                <MenuItem value="all">
                  <Checkbox
                    checked={
                      availableCities.length > 0 &&
                      formData.cities.length === availableCities.length
                    }
                  />
                  <ListItemText primary="Select All" />
                </MenuItem>
                {availableCities.map((city) => (
                  <MenuItem key={city} value={city}>
                    <Checkbox checked={formData.cities.indexOf(city) > -1} />
                    <ListItemText primary={city} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth disabled={isFieldDisabled}>
              <InputLabel>Business Types</InputLabel>
              <Select
                name="businessTypes"
                multiple
                value={formData.businessTypes}
                onChange={handleChange}
                input={<OutlinedInput label="Business Types" />}
                renderValue={(selected) => selected.join(', ')}
                MenuProps={MenuProps}
              >
                <MenuItem value="all">
                  <Checkbox
                    checked={
                      businessTypes.length > 0 &&
                      formData.businessTypes.length === businessTypes.length
                    }
                  />
                  <ListItemText primary="Select All" />
                </MenuItem>
                {businessTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    <Checkbox checked={formData.businessTypes.indexOf(type) > -1} />
                    <ListItemText primary={type} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
          disabled={!formData.projectName || (!formData.entireScraping && (!formData.state || formData.cities.length === 0 || formData.businessTypes.length === 0))}
        >
          Create Project
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewProjectModal;