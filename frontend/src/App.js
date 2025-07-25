import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { app, authentication } from '@microsoft/teams-js';
import OrgChartTab from './components/OrgChartTab';
import MapViewTab from './components/MapViewTab';
import MapDiagnostic from './components/MapDiagnostic';
import './App.css';

function App() {
  const [teamsContext, setTeamsContext] = useState(null);
  const [isTeamsInitialized, setIsTeamsInitialized] = useState(false);

  useEffect(() => {
    // Initialize Microsoft Teams SDK
    const initializeTeams = async () => {
      try {
        await app.initialize();
        const context = await app.getContext();
        setTeamsContext(context);
        setIsTeamsInitialized(true);
        
        // Configure Teams app theme
        app.notifyAppLoaded();
        app.notifySuccess();
      } catch (error) {
        console.error('Error initializing Teams:', error);
        // For development outside Teams
        setIsTeamsInitialized(true);
      }
    };

    initializeTeams();
  }, []);

  const getAuthToken = async () => {
    try {
      const token = await authentication.getAuthToken();
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  if (!isTeamsInitialized) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Initializing Teams App...</p>
      </div>
    );
  }

  return (
    <div className="App">
      <Router>
        <Routes>
          <Route 
            path="/org-chart" 
            element={
              <OrgChartTab 
                teamsContext={teamsContext} 
                getAuthToken={getAuthToken} 
              />
            } 
          />
          <Route 
            path="/map-view" 
            element={
              <MapViewTab 
                teamsContext={teamsContext} 
                getAuthToken={getAuthToken} 
              />
            } 
          />
          <Route 
            path="/map-diagnostic" 
            element={<MapDiagnostic />} 
          />
          <Route path="/" element={<Navigate to="/org-chart" replace />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
