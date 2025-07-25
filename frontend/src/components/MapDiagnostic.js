import React, { useState, useEffect } from 'react';
import * as atlas from 'azure-maps-control';

const MapDiagnostic = () => {
  const [diagnostics, setDiagnostics] = useState({
    azureMapsLoaded: false,
    apiKeyConfigured: false,
    mapInitialized: false,
    errors: []
  });

  useEffect(() => {
    const runDiagnostics = () => {
      const results = {
        azureMapsLoaded: false,
        apiKeyConfigured: false,
        mapInitialized: false,
        errors: []
      };

      // Check if Azure Maps is loaded
      try {
        if (atlas && atlas.Map) {
          results.azureMapsLoaded = true;
        }
      } catch (error) {
        results.errors.push(`Azure Maps not loaded: ${error.message}`);
      }

      // Check API key
      const apiKey = process.env.REACT_APP_AZURE_MAPS_API_KEY;
      if (apiKey && apiKey !== 'your_azure_maps_api_key_here') {
        results.apiKeyConfigured = true;
      } else {
        results.errors.push('Azure Maps API key not configured');
      }

      // Try to initialize a test map
      if (results.azureMapsLoaded && results.apiKeyConfigured) {
        try {
          const testDiv = document.createElement('div');
          testDiv.style.width = '100px';
          testDiv.style.height = '100px';
          testDiv.style.position = 'absolute';
          testDiv.style.top = '-1000px';
          document.body.appendChild(testDiv);

          const testMap = new atlas.Map(testDiv, {
            center: [0, 0],
            zoom: 1,
            authOptions: {
              authType: atlas.AuthenticationType.subscriptionKey,
              subscriptionKey: apiKey
            }
          });

          results.mapInitialized = true;
          
          // Clean up
          setTimeout(() => {
            try {
              testMap.dispose();
              document.body.removeChild(testDiv);
            } catch (e) {
              console.warn('Error cleaning up test map:', e);
            }
          }, 1000);
          
        } catch (error) {
          results.errors.push(`Map initialization failed: ${error.message}`);
        }
      }

      setDiagnostics(results);
    };

    runDiagnostics();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Azure Maps Diagnostic</h2>
      
      <div style={{ marginBottom: '10px' }}>
        <span style={{ color: diagnostics.azureMapsLoaded ? 'green' : 'red' }}>
          {diagnostics.azureMapsLoaded ? '✅' : '❌'}
        </span>
        <span> Azure Maps SDK Loaded</span>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <span style={{ color: diagnostics.apiKeyConfigured ? 'green' : 'red' }}>
          {diagnostics.apiKeyConfigured ? '✅' : '❌'}
        </span>
        <span> API Key Configured</span>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <span style={{ color: diagnostics.mapInitialized ? 'green' : 'red' }}>
          {diagnostics.mapInitialized ? '✅' : '❌'}
        </span>
        <span> Map Initialization Test</span>
      </div>

      {diagnostics.errors.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: 'red' }}>Errors:</h3>
          <ul>
            {diagnostics.errors.map((error, index) => (
              <li key={index} style={{ color: 'red' }}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <div>Atlas object available: {atlas ? 'Yes' : 'No'}</div>
        <div>API Key: {process.env.REACT_APP_AZURE_MAPS_API_KEY ? `${process.env.REACT_APP_AZURE_MAPS_API_KEY.substring(0, 8)}...` : 'Not set'}</div>
        <div>Environment: {process.env.NODE_ENV}</div>
      </div>
    </div>
  );
};

export default MapDiagnostic;
