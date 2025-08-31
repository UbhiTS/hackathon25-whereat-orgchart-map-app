import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as atlas from 'azure-maps-control';
import { getConfig } from '../config';
import ChatInterface from './ChatInterface';

const MapViewTab = ({ teamsContext, getAuthToken }) => {
  const [userEmail, setUserEmail] = useState('');
  const [mapData, setMapData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const popupRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [pendingMapData, setPendingMapData] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(3);

  // Get current user's email from Teams context
  useEffect(() => {
    if (teamsContext && teamsContext.user && teamsContext.user.userPrincipalName) {
      setUserEmail(teamsContext.user.userPrincipalName);
    }
  }, [teamsContext]);

  useEffect(() => {
    return () => {
      // Cleanup map on component unmount
      if (mapInstanceRef.current) {
        // Clean up cluster event listeners if they exist
        if (mapInstanceRef.current._clusterEventCleanup) {
          mapInstanceRef.current._clusterEventCleanup();
        }
        mapInstanceRef.current.dispose();
      }
    };
  }, []);

  // Function to add custom zoom controls
  const addCustomZoomControls = (map) => {
    // Create zoom control container
    const zoomContainer = document.createElement('div');
    zoomContainer.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      z-index: 1000;
    `;

    // Create zoom in button
    const zoomInBtn = document.createElement('button');
    zoomInBtn.innerHTML = '+';
    zoomInBtn.style.cssText = `
      width: 40px;
      height: 40px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #333;
      user-select: none;
    `;
    
    // Create zoom out button
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.innerHTML = '−';
    zoomOutBtn.style.cssText = `
      width: 40px;
      height: 40px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #333;
      user-select: none;
    `;

    // Add hover effects
    const addHoverEffect = (button) => {
      button.addEventListener('mouseenter', () => {
        button.style.background = '#f0f0f0';
      });
      button.addEventListener('mouseleave', () => {
        button.style.background = 'white';
      });
      button.addEventListener('mousedown', () => {
        button.style.background = '#e0e0e0';
      });
      button.addEventListener('mouseup', () => {
        button.style.background = '#f0f0f0';
      });
    };

    addHoverEffect(zoomInBtn);
    addHoverEffect(zoomOutBtn);

    // Add zoom functionality
    zoomInBtn.addEventListener('click', () => {
      const currentZoom = map.getCamera().zoom;
      map.setCamera({
        zoom: Math.min(currentZoom + 1, 20), // Don't zoom in beyond level 20
        type: 'ease',
        duration: 300
      });
    });

    zoomOutBtn.addEventListener('click', () => {
      const currentZoom = map.getCamera().zoom;
      map.setCamera({
        zoom: Math.max(currentZoom - 1, 1), // Don't zoom out below level 1
        type: 'ease',
        duration: 300
      });
    });

    // Add buttons to container
    zoomContainer.appendChild(zoomInBtn);
    zoomContainer.appendChild(zoomOutBtn);

    // Add container to map
    const mapContainer = map.getMapContainer();
    mapContainer.appendChild(zoomContainer);

    console.log('Custom zoom controls added to map');
  };

  const initializeMap = () => {
    if (!mapRef.current) {
      console.log('Map container not ready yet');
      return;
    }

    if (mapInstanceRef.current) {
      console.log('Map already exists');
      return;
    }

    // Check if Azure Maps API key is configured
    const config = getConfig();
    const apiKey = config.azureMapsApiKey;
    if (!apiKey || apiKey === 'your_azure_maps_api_key_here') {
      setError('Azure Maps API key not configured. Please check your environment variables.');
      return;
    }

    console.log('Initializing Azure Maps with USA default view...');
    setMapReady(false);

    try {
      // Initialize Azure Maps
      const map = new atlas.Map(mapRef.current, {
        center: [-98.5795, 39.8283], // Center of USA
        zoom: 3,
        language: 'en-US',
        authOptions: {
          authType: atlas.AuthenticationType.subscriptionKey,
          subscriptionKey: apiKey
        }
      });

      // Create popup for user info
      const popup = new atlas.Popup({
        pixelOffset: [0, -18],
        closeButton: false,
        fillColor: 'white',
        anchor: 'bottom', // Force popup to appear above pins
        positioning: 'fixed' // Disable automatic repositioning
      });

      mapInstanceRef.current = map;
      popupRef.current = popup;

      // Add custom CSS for popup styling
      const style = document.createElement('style');
      style.textContent = `
        .atlas-popup .atlas-popup-content {
          padding: 15px !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
          max-width: 300px !important;
        }
        
        .user-popup {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          text-align: center;
          user-select: text;
          cursor: default;
          position: relative;
        }
        
        .user-popup * {
          pointer-events: auto;
          user-select: text;
        }
        
        .user-popup .popup-close-btn {
          pointer-events: auto;
          cursor: pointer;
          user-select: none;
        }
        
        .popup-header {
          height: 24px;
          margin-bottom: 10px;
          cursor: default;
        }
        
        .popup-photo {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          object-fit: cover;
          margin-bottom: 10px;
        }
        
        .popup-name {
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 8px;
          color: #323130;
        }
        
        .popup-details {
          font-size: 12px;
          color: #605e5c;
          text-align: left;
          margin-bottom: 10px;
        }
        
        .popup-detail {
          margin-bottom: 4px;
        }
        
        .location-type-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          color: white !important;
          text-align: center;
          min-width: 80px;
          box-sizing: border-box;
        }
        
        .location-type-badge.address {
          background-color: #107c10;
        }
        
        .location-type-badge.office {
          background-color: #107c10;
        }
        
        .location-type-badge.phone {
          background-color: #ff8c00;
        }
        
        .location-type-badge.timezone {
          background-color: #8a8886;
        }
        
        .atlas-popup {
          z-index: 1000 !important;
        }
        
        .atlas-popup.dragging {
          z-index: 9999 !important;
        }
      `;
      document.head.appendChild(style);

      // Multiple approaches to detect when map is ready
      let readyCallbackTriggered = false;

      // Method 1: Official ready event
      map.events.add('ready', () => {
        if (readyCallbackTriggered) return;
        readyCallbackTriggered = true;
        console.log('Azure Maps ready event fired');
        handleMapReady();
      });

      // Method 2: Polling fallback for map readiness
      let readyCheckCount = 0;
      const maxReadyChecks = 30; // 15 seconds max
      const readyInterval = setInterval(() => {
        readyCheckCount++;
        
        if (readyCallbackTriggered) {
          clearInterval(readyInterval);
          return;
        }

        if (readyCheckCount >= maxReadyChecks) {
          clearInterval(readyInterval);
          console.warn('Map ready timeout, forcing ready state');
          if (!readyCallbackTriggered) {
            readyCallbackTriggered = true;
            handleMapReady();
          }
          return;
        }

        // Check if map is functionally ready
        try {
          if (map && map.sources && map.layers && map.getCamera && map.isReady && map.isReady()) {
            console.log(`Map appears ready (check ${readyCheckCount})`);
            clearInterval(readyInterval);
            if (!readyCallbackTriggered) {
              readyCallbackTriggered = true;
              handleMapReady();
            }
          }
        } catch (e) {
          // Map not ready yet, continue polling
          console.log(`Map not ready yet (check ${readyCheckCount}):`, e.message);
        }
      }, 500);

      // Method 3: Force ready after reasonable timeout
      setTimeout(() => {
        if (!readyCallbackTriggered) {
          console.log('Forcing map ready after timeout');
          readyCallbackTriggered = true;
          clearInterval(readyInterval);
          handleMapReady();
        }
      }, 10000); // 10 second absolute timeout

      const handleMapReady = () => {
        console.log('Azure Maps initialized successfully');
        
        // Double-check map is truly ready
        try {
          if (!map || !map.sources || !map.layers) {
            console.warn('Map not fully ready, waiting longer...');
            setTimeout(() => handleMapReady(), 1000);
            return;
          }
          
          // Test basic map functionality
          console.log('Testing basic map functionality...');
          const camera = map.getCamera();
          console.log('Map camera test successful:', camera);
          
        } catch (e) {
          console.warn('Map readiness check failed, but continuing anyway...', e.message);
        }

        // Add double right-click zoom out functionality
        let rightClickCount = 0;
        let rightClickTimer = null;
        
        map.events.add('contextmenu', (e) => {
          e.preventDefault(); // Prevent browser context menu
          
          rightClickCount++;
          
          if (rightClickTimer) {
            clearTimeout(rightClickTimer);
          }
          
          if (rightClickCount === 2) {
            // Double right-click detected - zoom out
            const currentZoom = map.getCamera().zoom;
            map.setCamera({
              zoom: Math.max(currentZoom - 1, 1), // Don't zoom out below level 1
              type: 'ease',
              duration: 300
            });
            rightClickCount = 0;
          } else {
            // Single right-click - reset counter after delay
            rightClickTimer = setTimeout(() => {
              rightClickCount = 0;
            }, 300);
          }
        });

        // Add custom zoom controls
        addCustomZoomControls(map);
        
        setMapReady(true);
        
        // If we have pending data, display it now
        if (pendingMapData && pendingMapData.length > 0) {
          console.log('Displaying pending map data...');
          setTimeout(() => {
            try {
              displayUsersOnMap(pendingMapData);
              setPendingMapData(null);
            } catch (mapError) {
              console.error('Error displaying pending data:', mapError);
              setError(`Map display error: ${mapError.message}`);
            }
          }, 1000); // Longer delay to ensure map is fully ready
        }
      };

      // Add error event handler
      map.events.add('error', (error) => {
        console.error('Azure Maps error:', error);
        setError('Azure Maps failed to initialize. Please check your API key and internet connection.');
        setMapReady(false);
      });

    } catch (err) {
      console.error('Error initializing Azure Maps:', err);
      setError(`Failed to initialize map: ${err.message}`);
      setMapReady(false);
    }
  };

  const fetchMapData = async (email) => {
    if (!email) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching map data for:', email);
      const config = getConfig();
      const backendUrl = config.backendUrl;
      const response = await axios.get(`${backendUrl}/api/map-data/${encodeURIComponent(email)}`);
      
      if (response.data.success) {
        console.log('Map data received:', response.data.data.length, 'users');
        setMapData(response.data.data);
        
        // Check if map is ready before trying to display users
        if (mapReady && mapInstanceRef.current) {
          console.log('Map is ready, displaying users immediately...');
          try {
            displayUsersOnMap(response.data.data);
          } catch (mapError) {
            console.error('Error displaying users on map:', mapError);
            setError(`Map display error: ${mapError.message}. Data was fetched successfully.`);
          }
        } else {
          console.log('Map not ready yet, storing data for later display...');
          setPendingMapData(response.data.data);
          
          // If map exists but not ready, wait a bit more
          if (mapInstanceRef.current) {
            setTimeout(() => {
              if (mapReady) {
                try {
                  displayUsersOnMap(response.data.data);
                  setPendingMapData(null);
                } catch (mapError) {
                  console.error('Error displaying users on map (delayed):', mapError);
                  setError(`Map display error: ${mapError.message}. Data was fetched successfully.`);
                }
              }
            }, 3000);
          }
        }
      } else {
        setError(response.data.error || 'Failed to fetch map data');
      }
    } catch (err) {
      console.error('Error fetching map data:', err);
      if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        const config = getConfig();
        setError(`Failed to connect to the server. Please check if the backend is running on ${config.backendUrl}`);
      } else if (err.response) {
        setError(`Server error: ${err.response.status} - ${err.response.data?.error || err.response.statusText}`);
      } else {
        setError(`Network error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const displayUsersOnMap = (users) => {
    const map = mapInstanceRef.current;
    const popup = popupRef.current;
    
    if (!map) {
      throw new Error('Map not initialized. Please wait for map to load.');
    }

    // Enhanced readiness check
    try {
      if (!map.sources || !map.layers || !map.getCamera) {
        throw new Error('Map not ready yet. Please wait for map to finish loading.');
      }
      
      // Test if map can accept operations
      map.getCamera();
    } catch (e) {
      throw new Error('Map not ready yet. Please wait for map to finish loading.');
    }

    if (!popup) {
      throw new Error('Map popup not initialized.');
    }

    if (!users || users.length === 0) {
      throw new Error('No user data to display on map.');
    }

    try {
      console.log('Starting to display users on map...');
      
      // Clear existing custom layers first (before sources)
      try {
        const layers = map.layers.getLayers();
        const customLayers = layers.filter(layer => {
          try {
            const layerId = layer.getId ? layer.getId() : '';
            return layerId.includes('user-');
          } catch (e) {
            return false;
          }
        });
        
        customLayers.forEach(layer => {
          try {
            map.layers.remove(layer);
            console.log('Removed layer:', layer.getId ? layer.getId() : 'unknown');
          } catch (e) {
            console.warn('Error removing layer:', e);
          }
        });
      } catch (e) {
        console.warn('Error clearing layers:', e);
      }

      // Then clear custom data sources
      try {
        const dataSources = map.sources.getSources();
        const customSources = dataSources.filter(source => {
          try {
            const sourceId = source.getId ? source.getId() : '';
            return sourceId.includes('user-data-');
          } catch (e) {
            return false;
          }
        });
        
        customSources.forEach(source => {
          try {
            map.sources.remove(source);
            console.log('Removed source:', source.getId ? source.getId() : 'unknown');
          } catch (e) {
            console.warn('Error removing source:', e);
          }
        });
      } catch (e) {
        console.warn('Error clearing sources:', e);
      }

      const coordinates = [];
      const features = [];
      let validLocationCount = 0;

      users.forEach((userLocationData, index) => {
        const { user, location, border_color, location_type } = userLocationData;

        // Enhanced validation for user and location data
        if (!user || !location) {
          console.warn(`Missing user or location data for index ${index}`);
          return;
        }

        if (!location.latitude || !location.longitude) {
          console.warn(`No valid location for user: ${user.displayName || 'Unknown'}`);
          return;
        }

        // Validate coordinates are within reasonable bounds and not null
        const lat = parseFloat(location.latitude);
        const lng = parseFloat(location.longitude);
        
        console.log(`Validating coordinates for ${user.displayName || 'Unknown'}:`, {
          rawLat: location.latitude,
          rawLng: location.longitude,
          parsedLat: lat,
          parsedLng: lng,
          isValidLat: !isNaN(lat) && lat !== null && lat >= -85 && lat <= 85,
          isValidLng: !isNaN(lng) && lng !== null && lng >= -180 && lng <= 180,
          locationType: location_type
        });
        
        if (isNaN(lat) || isNaN(lng) || lat === null || lng === null || 
            lat < -85 || lat > 85 || lng < -180 || lng > 180) {
          console.warn(`Invalid coordinates for user ${user.displayName || 'Unknown'}: lat=${lat}, lng=${lng}`);
          return;
        }

        const coordinate = [lng, lat];
        coordinates.push(coordinate);
        validLocationCount++;

        // Enhanced validation for user properties
        const feature = new atlas.data.Feature(new atlas.data.Point(coordinate), {
          userId: user.id || `user_${index}`,
          userName: user.displayName || 'Unknown User',
          userTitle: user.jobTitle || '',
          userDepartment: user.department || '',
          userEmail: user.mail || user.userPrincipalName || '',
          locationAddress: location.address || 'Unknown Location',
          locationType: location_type || 'unknown',
          borderColor: border_color || 'gray',
          photoUrl: `user-photo-${user.id || `user_${index}`}`, // This will be the custom pin image ID
          originalPhotoUrl: `${getConfig().backendUrl}/api/user-photo/${user.id || 'default'}` // Keep original for popup
        });

        features.push(feature);
      });

      if (validLocationCount === 0) {
        // No valid locations found - let's debug what we received
        console.log('No users with valid locations found, debugging data:');
        users.forEach((userLocationData, index) => {
          const { user, location, location_type } = userLocationData;
          console.log(`User ${index + 1}:`, {
            name: user?.displayName || 'Unknown',
            locationType: location_type,
            location: location,
            hasLatLng: !!(location?.latitude && location?.longitude),
            lat: location?.latitude,
            lng: location?.longitude
          });
        });
        
        // Set to US view
        map.setCamera({
          center: [-98.5795, 39.8283], // Center of US
          zoom: 3
        });
        throw new Error('No users have valid location data to display on the map.');
      }

      console.log(`Displaying ${validLocationCount} users on map`);

      // Create data source and add features with better error handling
      try {
        // Create a unique data source ID to avoid conflicts
        const dataSourceId = `user-data-${Date.now()}`;
        const dataSource = new atlas.source.DataSource(dataSourceId, {
          // Optimize clustering settings to handle decimal zoom levels and identical coordinates
          cluster: true,
          clusterRadius: 60, // Increased radius to ensure clustering at decimal zooms
          clusterMaxZoom: 24, // Allow clustering at all zoom levels to prevent data loss for identical coordinates
          clusterMinPoints: 2, // Require 2+ points to form cluster
          // Add buffer to prevent clustering inconsistencies at decimal zoom levels
          clusterProperties: {
            // Create aggregated properties for clusters
            'userNames': ['concat', ['concat', '', ['get', 'userName']], ['literal', '\n']],
            'userCount': ['+', ['case', ['has', 'point_count'], ['get', 'point_count'], 1]],
            'locationTypes': ['concat', ['concat', '', ['get', 'locationType']], ['literal', ',']]
          }
        });
        
        map.sources.add(dataSource);
        
        if (features.length > 0) {
          dataSource.add(features);
          console.log(`Added ${features.length} features to data source ${dataSourceId}`);
        } else {
          throw new Error('No valid features to add to map');
        }

        // Create symbol layer for user pins with custom profile photos
        const layerId = `user-symbols-${Date.now()}`;
        const symbolLayer = new atlas.layer.SymbolLayer(dataSource, layerId, {
          minZoom: 0,
          maxZoom: 24,
          iconOptions: {
            image: ['case',
              ['has', 'point_count'],
              ['case',
                ['<', ['get', 'point_count'], 21],
                ['concat', 'cluster-', ['to-string', ['get', 'point_count']]],
                'cluster-large'
              ],
              ['get', 'photoUrl']
            ],
            anchor: 'bottom',
            allowOverlap: true,
            ignorePlacement: true,
            size: ['case', 
              ['has', 'point_count'], 
              ['interpolate', ['linear'], ['get', 'point_count'], 2, 0.9, 10, 1.3, 20, 1.5],
              0.8
            ],
            offset: [0, 0]
          },
          textOptions: {
            textField: ['case',
              ['has', 'point_count'],
              '', // No text for clusters (count is in the image)
              ['get', 'userName'] // Show name for individual pins
            ],
            anchor: 'top',
            offset: [0, 0],
            size: 16,
            color: '#000000',
            haloColor: '#ffffff',
            haloWidth: 3,
            font: ['StandardFont-Bold']
          }
        });

        // Add profile photos as custom images to the map
        const addProfilePhotos = async () => {
          const getBorderColor = (borderColor) => {
            switch (borderColor) {
              case 'green': return '#107c10';
              case 'orange': return '#ff8c00';
              case 'gray':
              default: return '#8a8886';
            }
          };

          // Create cluster images first
          const createClusterImage = async (count, size = 120) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = size;
            canvas.height = size;

            // Draw cluster circle with shadow
            ctx.save();
            ctx.translate(3, 3);
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(size/2, size/2, size/2 - 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();

            // Draw main cluster circle
            ctx.fillStyle = '#6264a7';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(size/2, size/2, size/2 - 8, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();

            // Draw inner circle
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(size/2, size/2, size/2 - 20, 0, 2 * Math.PI);
            ctx.fill();

            // Draw count text
            ctx.fillStyle = '#6264a7';
            ctx.font = `bold ${Math.min(size/4, 24)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(count.toString(), size/2, size/2);

            return canvas.toDataURL('image/png');
          };

          // Create cluster images for different sizes
          for (let i = 2; i <= 20; i++) {
            const clusterImage = await createClusterImage(i);
            await map.imageSprite.add(`cluster-${i}`, clusterImage);
          }

          // Create a generic large cluster image
          const largeClusterImage = await createClusterImage('20+', 140);
          await map.imageSprite.add('cluster-large', largeClusterImage);

          // Create custom cluster image for our manual clustering
          const customClusterImage = await createClusterImage('●', 100);
          await map.imageSprite.add('cluster-custom', customClusterImage);

          for (let i = 0; i < features.length; i++) {
            const feature = features[i];
            const userId = feature.properties.userId;
            const originalPhotoUrl = feature.properties.originalPhotoUrl; // Use original URL for loading
            
            try {
              // Create a custom teardrop pin with profile photo
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              const pinWidth = 120;
              const pinHeight = 150;
              canvas.width = pinWidth;
              canvas.height = pinHeight;

              // Get border color
              const borderColor = feature.properties.borderColor || 'gray';
              const borderHex = getBorderColor(borderColor);
              
              // Create teardrop/pin shape
              const centerX = pinWidth / 2;
              const centerY = pinWidth / 2; // Circle center
              const radius = (pinWidth - 20) / 2; // Leave margin for border
              const pointY = pinHeight - 10; // Bottom point of teardrop

              // Draw pin shadow first (slightly offset)
              ctx.save();
              ctx.translate(3, 3);
              ctx.globalAlpha = 0.3;
              ctx.fillStyle = '#000000';
              
              // Shadow teardrop shape
              ctx.beginPath();
              ctx.arc(centerX, centerY, radius + 2, 0, 2 * Math.PI);
              ctx.moveTo(centerX, centerY + radius + 2);
              ctx.lineTo(centerX - 8, pointY);
              ctx.lineTo(centerX + 8, pointY);
              ctx.closePath();
              ctx.fill();
              ctx.restore();

              // Draw main pin border
              ctx.fillStyle = borderHex;
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 3;
              
              // Main teardrop shape
              ctx.beginPath();
              ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
              ctx.moveTo(centerX, centerY + radius);
              ctx.lineTo(centerX - 6, pointY);
              ctx.lineTo(centerX + 6, pointY);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();

              // Draw inner white circle for photo
              const photoRadius = radius - 8;
              ctx.beginPath();
              ctx.arc(centerX, centerY, photoRadius, 0, 2 * Math.PI);
              ctx.fillStyle = '#ffffff';
              ctx.fill();
              ctx.stroke();

              // Create clipping path for circular photo
              ctx.save();
              ctx.beginPath();
              ctx.arc(centerX, centerY, photoRadius - 2, 0, 2 * Math.PI);
              ctx.clip();

              // Load and draw profile photo
              const img = new Image();
              img.crossOrigin = 'anonymous';
              
              await new Promise((resolve) => {
                img.onload = () => {
                  // Calculate photo dimensions to fill circle
                  const photoSize = (photoRadius - 2) * 2;
                  const photoX = centerX - (photoRadius - 2);
                  const photoY = centerY - (photoRadius - 2);
                  
                  // Draw the profile photo to fill the circle
                  ctx.drawImage(img, photoX, photoY, photoSize, photoSize);
                  ctx.restore();
                  resolve();
                };
                
                img.onerror = () => {
                  // Draw default avatar if photo fails to load
                  const photoSize = (photoRadius - 2) * 2;
                  const photoX = centerX - (photoRadius - 2);
                  const photoY = centerY - (photoRadius - 2);
                  
                  ctx.fillStyle = '#6264a7';
                  ctx.fillRect(photoX, photoY, photoSize, photoSize);
                  
                  // Draw person icon in white
                  ctx.fillStyle = '#ffffff';
                  // Head
                  ctx.beginPath();
                  ctx.arc(centerX, centerY - 15, 18, 0, 2 * Math.PI);
                  ctx.fill();
                  
                  // Body
                  ctx.beginPath();
                  ctx.arc(centerX, centerY + 20, 25, Math.PI, 0, true);
                  ctx.fill();
                  
                  ctx.restore();
                  resolve();
                };
                
                // Set timeout for image loading
                setTimeout(() => {
                  if (!img.complete) {
                    img.onerror();
                  }
                }, 3000);
                
                img.src = originalPhotoUrl; // Use original photo URL
              });

              // Convert canvas to data URL and add to map
              const dataUrl = canvas.toDataURL('image/png');
              const imageId = `user-photo-${userId}`;
              
              // Add the custom image to the map's image sprite
              await new Promise((resolve) => {
                map.imageSprite.add(imageId, dataUrl).then(() => {
                  // Update the feature to use the custom image
                  feature.properties.photoUrl = imageId;
                  resolve();
                }).catch((error) => {
                  console.warn(`Failed to add image ${imageId} to sprite:`, error);
                  feature.properties.photoUrl = 'pin-round-blue';
                  resolve();
                });
              });
              
            } catch (error) {
              console.warn(`Failed to create profile photo pin for user ${userId}:`, error);
              // Fallback to default pin
              feature.properties.photoUrl = 'pin-round-blue';
            }
          }
          
          // Update the data source with the modified features
          dataSource.clear();
          dataSource.add(features);
        };

        // Add the layer first, then load photos
        map.layers.add(symbolLayer);
        console.log(`Added symbol layer ${layerId} to map`);
        
        // Create a backup layer for individual pins to ensure they're always visible
        // This layer shows individual pins at high zoom levels only when they're not clustered
        const individualPinLayer = new atlas.layer.SymbolLayer(dataSource, `${layerId}-individual`, {
          minZoom: 18, // Show individual pins only at very high zoom levels
          maxZoom: 24,
          filter: [
            'all',
            ['!', ['has', 'point_count']], // Only show non-clustered points
            // Additional filter to ensure we don't show duplicate pins for identical coordinates
            ['!=', ['get', 'clustered'], true]
          ],
          iconOptions: {
            image: ['get', 'photoUrl'],
            anchor: 'bottom',
            allowOverlap: true,
            ignorePlacement: true,
            size: 0.8,
            offset: [0, 0]
          },
          textOptions: {
            textField: ['get', 'userName'],
            anchor: 'top',
            offset: [0, 0],
            size: 16,
            color: '#000000',
            haloColor: '#ffffff',
            haloWidth: 3,
            font: ['StandardFont-Bold']
          }
        });
        
        map.layers.add(individualPinLayer);
        console.log(`Added individual pin backup layer ${layerId}-individual to map`);
        
        // Load profile photos asynchronously
        addProfilePhotos().then(() => {
          console.log('Profile photos loaded for map pins');
        }).catch((error) => {
          console.warn('Error loading profile photos:', error);
        });

        // Add click event for user info popup and cluster tooltip
        map.events.add('click', symbolLayer, (e) => {
          if (e.shapes && e.shapes.length > 0) {
            const shape = e.shapes[0];
            
            // Stop event propagation to prevent map background click
            if (e.originalEvent && e.originalEvent.stopPropagation) {
              e.originalEvent.stopPropagation();
            }
            
            // Get properties differently for clusters vs individual features
            let properties;
            if (shape.getProperties) {
              properties = shape.getProperties();
            } else if (shape.properties) {
              properties = shape.properties;
            } else {
              console.warn('Unable to get properties from shape:', shape);
              return;
            }
            
            if (properties.cluster || properties.point_count) {
              // This is a cluster, show cluster tooltip on click
              console.log('Showing cluster tooltip on click');
              showClusterTooltip(shape, properties);
            } else {
              // This is an individual pin, show user popup
              console.log('Individual pin clicked, properties:', properties);
              
              // Get the pin's actual coordinates (not the click position)
              const pinPosition = shape.getCoordinates ? shape.getCoordinates() : [shape.geometry.coordinates[0], shape.geometry.coordinates[1]];
              console.log('Pin position:', pinPosition);
              showUserPopup(properties, pinPosition);
            }
          }
        });

        // Add double-click event for cluster zoom functionality
        map.events.add('dblclick', symbolLayer, (e) => {
          if (e.shapes && e.shapes.length > 0) {
            const shape = e.shapes[0];
            
            // Stop event propagation to prevent map background click
            if (e.originalEvent && e.originalEvent.stopPropagation) {
              e.originalEvent.stopPropagation();
            }
            
            // Get properties differently for clusters vs individual features
            let properties;
            if (shape.getProperties) {
              properties = shape.getProperties();
            } else if (shape.properties) {
              properties = shape.properties;
            } else {
              return;
            }
            
            if (properties.cluster || properties.point_count) {
              // This is a cluster, zoom in on double-click
              console.log('Double-click detected on cluster, zooming in');
              const clusterId = properties.cluster_id;
              if (clusterId && dataSource.getClusterExpansionZoom) {
                dataSource.getClusterExpansionZoom(clusterId).then((zoom) => {
                  map.setCamera({
                    center: shape.getCoordinates ? shape.getCoordinates() : [shape.geometry.coordinates[0], shape.geometry.coordinates[1]],
                    zoom: zoom,
                    type: 'ease',
                    duration: 500
                  });
                }).catch((error) => {
                  console.warn('Error getting cluster expansion zoom:', error);
                  // Fallback: just zoom in a bit
                  const currentZoom = map.getCamera().zoom;
                  map.setCamera({
                    center: shape.getCoordinates ? shape.getCoordinates() : [shape.geometry.coordinates[0], shape.geometry.coordinates[1]],
                    zoom: Math.min(currentZoom + 3, 18),
                    type: 'ease',
                    duration: 500
                  });
                });
              }
            }
          }
        });

        // Cluster tooltip management (now click-based instead of hover)
        let currentClusterPopup = null;

        const showClusterTooltip = (shape, properties) => {
          const clusterId = properties.cluster_id;
          if (clusterId && dataSource.getClusterLeaves) {
            dataSource.getClusterLeaves(clusterId, properties.point_count, 0).then((leaves) => {
              const popup = popupRef.current;
              
              // Store cluster world coordinates for positioning calculations
              const clusterPosition = shape.getCoordinates ? shape.getCoordinates() : [shape.geometry.coordinates[0], shape.geometry.coordinates[1]];
              
              // Static positioning: always center popup above the cluster
              const pixelOffset = [0, -100]; // Fixed position: centered above cluster, 100px offset
              
              // Create detailed member list with profile images
              const memberRows = leaves.map(leaf => {
                const leafProps = leaf.getProperties ? leaf.getProperties() : leaf.properties;
                const userName = leafProps.userName || 'Unknown User';
                const userEmail = leafProps.userEmail || '';
                const originalPhotoUrl = leafProps.originalPhotoUrl || `${getConfig().backendUrl}/api/user-photo/${leafProps.userId || 'default'}`;
                
                return `
                  <div style="
                    display: flex;
                    align-items: center;
                    padding: 12px;
                    border-bottom: 1px solid #f3f2f1;
                    gap: 15px;
                    user-select: text;
                  ">
                    <img 
                      src="${originalPhotoUrl}" 
                      alt="${userName}"
                      style="
                        width: 60px;
                        height: 60px;
                        border-radius: 50%;
                        object-fit: cover;
                        border: 3px solid #e1dfdd;
                        flex-shrink: 0;
                        user-select: none;
                      "
                      onerror="this.src='data:image/svg+xml;base64,${getDefaultAvatarBase64()}'"
                    />
                    <div style="flex: 1; min-width: 0; text-align: left; user-select: text;">
                      <div style="
                        font-weight: 600;
                        font-size: 14px;
                        color: #323130;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        text-align: left;
                        margin-bottom: 4px;
                        user-select: text;
                      ">${userName}</div>
                      <div style="
                        font-size: 12px;
                        color: #605e5c;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        text-align: left;
                        user-select: text;
                      ">${userEmail}</div>
                    </div>
                  </div>
                `;
              }).join('');
              
              // Check if all cluster members have identical coordinates
              const firstCoord = leaves[0].getCoordinates ? leaves[0].getCoordinates() : leaves[0].geometry.coordinates;
              const hasIdenticalCoordinates = leaves.every(leaf => {
                const coord = leaf.getCoordinates ? leaf.getCoordinates() : leaf.geometry.coordinates;
                return coord[0] === firstCoord[0] && coord[1] === firstCoord[1];
              });
              
              const tooltipId = `cluster-tooltip-content-${Date.now()}`;
              const clusterContent = `
                <div id="${tooltipId}" class="cluster-tooltip-content" style="
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  max-width: 300px;
                  min-width: 250px;
                  user-select: text;
                  cursor: default;
                ">
                  <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-weight: bold; 
                    padding: 12px;
                    color: #323130;
                    background-color: #f8f7ff;
                    border-bottom: 2px solid #6264a7;
                    user-select: text;
                  ">
                    <span>${properties.point_count} Team Members${hasIdenticalCoordinates ? ' (Same Location)' : ''}</span>
                    <button class="cluster-tooltip-close-btn" data-close-cluster-tooltip="true" style="
                      background: #f3f2f1;
                      border: 1px solid #8a8886;
                      border-radius: 50%;
                      width: 24px;
                      height: 24px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      cursor: pointer;
                      font-size: 14px;
                      font-weight: bold;
                      color: #323130;
                      padding: 0;
                      margin: 0;
                      pointer-events: auto;
                      user-select: none;
                    " onmouseover="this.style.background='#e1dfdd'" onmouseout="this.style.background='#f3f2f1'">×</button>
                  </div>
                  <div style="
                    max-height: 240px;
                    overflow-y: auto;
                    overflow-x: hidden;
                    user-select: text;
                  ">
                    ${memberRows}
                  </div>
                  <div style="
                    font-size: 11px; 
                    color: #8a8886; 
                    padding: 8px;
                    text-align: center;
                    font-style: italic;
                    background-color: #faf9f8;
                    border-top: 1px solid #f3f2f1;
                    user-select: none;
                  ">
                    ${hasIdenticalCoordinates ? 'Users at identical location - cluster persists at all zoom levels' : 'Click to zoom in and expand'}
                  </div>
                </div>
              `;
              
              popup.setOptions({
                content: clusterContent,
                position: clusterPosition,
                closeButton: false,
                fillColor: 'white',
                pixelOffset: pixelOffset,
                anchor: 'bottom', // Force popup to appear above the pin
                positioning: 'fixed' // Disable automatic repositioning
              });
              
              popup.open(map);
              currentClusterPopup = popup;

              // Set initial popup state and add close button functionality
              setTimeout(() => {
                console.log('Cluster tooltip opened');
                
                // Add close button functionality
                const closeButton = document.querySelector('[data-close-cluster-tooltip="true"]');
                if (closeButton) {
                  closeButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Cluster tooltip close button clicked');
                    if (currentClusterPopup) {
                      currentClusterPopup.close();
                      currentClusterPopup = null;
                    }
                  });
                }
              }, 10);
              
            }).catch((error) => {
              console.warn('Error getting cluster leaves:', error);
            });
          }
        };

        // User popup function - moved inside scope to access map variable
        const showUserPopup = (properties, pinPosition) => {
          console.log('showUserPopup called with properties:', properties);
          console.log('showUserPopup called with pin position:', pinPosition);
          
          const popup = popupRef.current;
          if (!popup) {
            console.error('Popup ref is not available');
            return;
          }

          console.log('Popup ref is available, creating content...');

          // Static positioning: always center popup above the user pin
          const pixelOffset = [0, -110]; // Fixed position: centered above pin, 120px offset (same as cluster)

          const locationTypeText = {
            'address': 'Address',
            'office': 'Office Location', 
            'phone': 'Phone Approximation',
            'timezone': 'Timezone Approximation'
          };

          const borderColorClass = properties.borderColor || 'gray';
          const locationType = properties.locationType || 'unknown';
          const locationTypeDisplay = locationTypeText[locationType] || `Unknown (${locationType})`;
          
          console.log('Location type debug:', {
            rawLocationType: properties.locationType,
            cleanLocationType: locationType,
            displayText: locationTypeDisplay,
            availableTypes: Object.keys(locationTypeText)
          });

          const content = `
            <div class="user-popup" id="user-popup-${properties.userId}" style="position: relative; cursor: default;">
              <div class="popup-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; cursor: default;">
                <div style="flex: 1;"></div>
                <button class="popup-close-btn" data-close-popup="true" style="
                  background: #f3f2f1;
                  border: 1px solid #8a8886;
                  border-radius: 50%;
                  width: 24px;
                  height: 24px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: bold;
                  color: #323130;
                  padding: 0;
                  margin: 0;
                  user-select: none;
                " onmouseover="this.style.background='#e1dfdd'" onmouseout="this.style.background='#f3f2f1'">×</button>
              </div>
              <img 
                class="popup-photo" 
                src="${properties.originalPhotoUrl}" 
                alt="${properties.userName}"
                style="border: 3px solid ${getBorderColorHex(borderColorClass)}; pointer-events: none; user-select: none;"
                onerror="this.src='data:image/svg+xml;base64,${getDefaultAvatarBase64()}'"
              />
              <div class="popup-name" style="pointer-events: auto; user-select: text;">${properties.userName}</div>
              <div class="popup-details" style="pointer-events: auto; user-select: text;">
                ${properties.userTitle ? `<div class="popup-detail"><strong>Title:</strong> ${properties.userTitle}</div>` : ''}
                ${properties.userDepartment ? `<div class="popup-detail"><strong>Department:</strong> ${properties.userDepartment}</div>` : ''}
                ${properties.userEmail ? `<div class="popup-detail"><strong>Email:</strong> ${properties.userEmail}</div>` : ''}
                ${properties.locationAddress ? `<div class="popup-detail"><strong>Location:</strong> ${properties.locationAddress}</div>` : ''}
              </div>
              <div class="location-type-badge ${locationType}" style="pointer-events: none; user-select: none;">${locationTypeDisplay}</div>
            </div>
          `;

          popup.setOptions({
            content: content,
            position: pinPosition, // Use the pin's actual coordinates
            closeButton: false, // We're using our custom close button
            fillColor: 'white',
            pixelOffset: pixelOffset, // Use calculated position
            anchor: 'bottom', // Force popup to appear above the pin
            positioning: 'fixed' // Disable automatic repositioning
          });

          console.log('Opening popup with pin position:', pinPosition, 'and pixel offset:', pixelOffset);
          popup.open(map); // Now we can use the local 'map' variable

          // Wait for the popup to be rendered, then add event listeners
          setTimeout(() => {
            const closeButton = document.querySelector('[data-close-popup="true"]');

            // Add close button functionality
            if (closeButton) {
              closeButton.addEventListener('click', () => {
                popup.close();
              });
            }
          }, 100);
        };

        // Debug function to track cluster visibility at different zoom levels
        const debugClusterVisibility = () => {
          const currentZoom = map.getCamera().zoom;
          const features = dataSource.getShapes();
          const clusterCount = features.filter(f => f.getProperties().cluster).length;
          const individualCount = features.filter(f => !f.getProperties().cluster).length;
          
          console.log(`Zoom ${currentZoom.toFixed(1)}: ${clusterCount} clusters, ${individualCount} individual pins, ${features.length} total features`);
        };

        // Add map zoom event handler to close tooltips when zoom changes
        const handleMapChange = () => {
          if (currentClusterPopup) {
            console.log('Map zoom changed, closing cluster tooltip');
            currentClusterPopup.close();
            currentClusterPopup = null;
          }
          
          // Update zoom level in state for debug display
          const newZoom = map.getCamera().zoom;
          setCurrentZoom(newZoom);
          
          // Force data source refresh to ensure consistent clustering at decimal zoom levels
          // This prevents the issue where pins disappear at decimal zooms like 4.8
          const currentFeatures = dataSource.toJson();
          if (currentFeatures && currentFeatures.features && currentFeatures.features.length > 0) {
            // Small delay to allow zoom to settle, then refresh
            setTimeout(() => {
              dataSource.clear();
              dataSource.add(currentFeatures.features);
              console.log(`Refreshed clustering for zoom ${newZoom.toFixed(1)} with ${currentFeatures.features.length} features`);
            }, 50);
          }
          
          // Debug cluster visibility
          debugClusterVisibility();
        };

        map.events.add('zoom', handleMapChange);
        // Note: Removed 'move' event handler to prevent closing popup during drag operations

        map.events.add('mousemove', symbolLayer, (e) => {
          map.getCanvasContainer().style.cursor = 'pointer';
          
          // No longer show tooltips on hover - tooltips now appear on click only
          // Just handle cursor changes for visual feedback
        });

        map.events.add('mouseleave', symbolLayer, () => {
          map.getCanvasContainer().style.cursor = 'grab';
        });

        // Add general map click handler to close popups when clicking on background
        // Track mouse movement to differentiate between click and drag
        let mouseDownPosition = null;
        let isDragging = false;
        
        map.events.add('mousedown', (e) => {
          mouseDownPosition = e.position ? [e.position[0], e.position[1]] : null;
          isDragging = false;
        });
        
        map.events.add('mousemove', (e) => {
          if (mouseDownPosition && e.position) {
            const distance = Math.sqrt(
              Math.pow(e.position[0] - mouseDownPosition[0], 2) + 
              Math.pow(e.position[1] - mouseDownPosition[1], 2)
            );
            // If mouse moved more than 5 pixels, consider it a drag
            if (distance > 5) {
              isDragging = true;
            }
          }
        });
        
        map.events.add('click', (e) => {
          console.log('Map click event fired:', e, 'isDragging:', isDragging);
          console.log('Event shapes:', e.shapes);
          console.log('Event target:', e.originalEvent?.target);
          
          // Don't close popups if this was a drag operation
          if (isDragging) {
            console.log('Drag detected, not closing popups');
            return;
          }
          
          // Check if the click was on the map background (not on any symbol layer)
          // Only close popups if clicking on empty map areas, not on pins or clusters
          
          // If there are shapes at this click location, don't close popups
          // (this means we clicked on a pin or cluster)
          if (e.shapes && e.shapes.length > 0) {
            console.log('Click on shapes detected, not closing popups');
            return;
          }
          
          // Check if the click target is within a popup element
          if (e.originalEvent && e.originalEvent.target) {
            const target = e.originalEvent.target;
            console.log('Checking click target:', target);
            
            // Don't close if clicking on popup content, cluster tooltip content, or close buttons
            const isPopupElement = target.closest('.atlas-popup') || 
                                 target.closest('.user-popup') || 
                                 target.closest('.cluster-tooltip-content') ||
                                 target.closest('[data-close-popup]') ||
                                 target.closest('[data-close-cluster-tooltip]');
                                 
            if (isPopupElement) {
              console.log('Click on popup element detected, not closing popups');
              return;
            }
          }
          
          console.log('Background click detected, checking for open popups...');
          
          // Only close popups if they're actually open to avoid unnecessary operations
          let closedSomething = false;
          
          // Close cluster tooltip if open
          if (currentClusterPopup) {
            console.log('Closing cluster tooltip due to map background click');
            currentClusterPopup.close();
            currentClusterPopup = null;
            closedSomething = true;
          }
          
          // Close user popup if open
          const userPopup = popupRef.current;
          if (userPopup && userPopup.isOpen()) {
            console.log('Closing user popup due to map background click');
            userPopup.close();
            closedSomething = true;
          }
          
          if (closedSomething) {
            console.log('Map background clicked, closed open popups');
          } else {
            console.log('Map background clicked, but no popups were open');
          }
        });

        // Alternative approach: Add direct click listener to map container as fallback
        const mapContainer = map.getMapContainer();
        let directMouseDownPosition = null;
        let directIsDragging = false;
        
        const handleDirectMouseDown = (event) => {
          directMouseDownPosition = [event.clientX, event.clientY];
          directIsDragging = false;
        };
        
        const handleDirectMouseMove = (event) => {
          if (directMouseDownPosition) {
            const distance = Math.sqrt(
              Math.pow(event.clientX - directMouseDownPosition[0], 2) + 
              Math.pow(event.clientY - directMouseDownPosition[1], 2)
            );
            // If mouse moved more than 5 pixels, consider it a drag
            if (distance > 5) {
              directIsDragging = true;
            }
          }
        };
        
        const handleDirectClick = (event) => {
          console.log('Direct map container click:', event, 'isDragging:', directIsDragging);
          
          // Don't close popups if this was a drag operation
          if (directIsDragging) {
            console.log('Direct drag detected, not closing popups');
            return;
          }
          
          // Check if click is on popup elements
          const target = event.target;
          const isPopupElement = target.closest('.atlas-popup') || 
                               target.closest('.user-popup') || 
                               target.closest('.cluster-tooltip-content') ||
                               target.closest('[data-close-popup]') ||
                               target.closest('[data-close-cluster-tooltip]');
          
          if (isPopupElement) {
            console.log('Direct click on popup element, not closing');
            return;
          }
          
          // Check if click is on user pins or clusters by checking for symbol layer elements
          const isSymbolElement = target.closest('canvas') && 
                                 (event.target.tagName === 'CANVAS' || 
                                  event.target.closest('.atlas-map'));
          
          if (isSymbolElement) {
            console.log('Direct click on map canvas, closing popups');
            
            let closedSomething = false;
            
            // Close cluster tooltip if open
            if (currentClusterPopup) {
              console.log('Direct close: cluster tooltip');
              currentClusterPopup.close();
              currentClusterPopup = null;
              closedSomething = true;
            }
            
            // Close user popup if open
            const userPopup = popupRef.current;
            if (userPopup && userPopup.isOpen()) {
              console.log('Direct close: user popup');
              userPopup.close();
              closedSomething = true;
            }
            
            if (closedSomething) {
              console.log('Direct map click closed popups');
            }
          }
        };
        
        mapContainer.addEventListener('mousedown', handleDirectMouseDown);
        mapContainer.addEventListener('mousemove', handleDirectMouseMove);
        mapContainer.addEventListener('click', handleDirectClick);

        // Cleanup function to remove event listeners
        const cleanupClusterEvents = () => {
          map.events.remove('zoom', handleMapChange);
          // Note: No move event to remove since we don't use it anymore
          map.events.remove('click'); // Remove general map click handler
          map.events.remove('mousedown'); // Remove mousedown handler
          map.events.remove('mousemove'); // Remove mousemove handler
          mapContainer.removeEventListener('mousedown', handleDirectMouseDown); // Remove direct mousedown handler
          mapContainer.removeEventListener('mousemove', handleDirectMouseMove); // Remove direct mousemove handler
          mapContainer.removeEventListener('click', handleDirectClick); // Remove direct click handler
          if (currentClusterPopup) {
            currentClusterPopup.close();
            currentClusterPopup = null;
          }
        };

        // Store cleanup function for later use
        map._clusterEventCleanup = cleanupClusterEvents;

      } catch (sourceError) {
        console.error('Error creating data source or layer:', sourceError);
        
        // Try to at least show the map in the correct location even if pins fail
        if (coordinates.length > 0) {
          try {
            if (coordinates.length === 1) {
              const [lng, lat] = coordinates[0];
              console.log('Fallback: centering map on single user location');
              map.setCamera({
                center: [lng, lat],
                zoom: 10,
                duration: 1000
              });
            } else {
              console.log('Fallback: using USA view for multiple users');
              map.setCamera({
                center: [-98.5795, 39.8283],
                zoom: 3
              });
            }
          } catch (cameraError) {
            console.warn('Even camera fallback failed:', cameraError);
          }
        }
        
        throw new Error(`Failed to add user data to map: ${sourceError.message}. Map positioned but pins not visible.`);
      }

      // Fit map to show all users with proper bounds validation
      if (coordinates.length > 0) {
        try {
          if (coordinates.length === 1) {
            // Single user - center on their location with appropriate zoom
            const [lng, lat] = coordinates[0];
            console.log(`Centering map on single user at [${lng}, ${lat}]`);
            map.setCamera({
              center: [lng, lat],
              zoom: 10, // City-level zoom for single user
              duration: 1000
            });
          } else {
            // Multiple users - fit bounds
            const bounds = atlas.data.BoundingBox.fromPositions(coordinates);
            
            // Validate bounds to prevent geometry extent errors
            if (bounds && 
                bounds[0] >= -180 && bounds[0] <= 180 && // west longitude
                bounds[1] >= -85 && bounds[1] <= 85 &&   // south latitude
                bounds[2] >= -180 && bounds[2] <= 180 && // east longitude
                bounds[3] >= -85 && bounds[3] <= 85) {   // north latitude
              
              map.setCamera({
                bounds: bounds,
                padding: 50,
                maxZoom: 15 // Prevent excessive zoom
              });
            } else {
              console.warn('Invalid bounds, using USA default view');
              map.setCamera({
                center: [-98.5795, 39.8283], // Center of USA
                zoom: 3
              });
            }
          }
        } catch (boundsError) {
          console.warn('Error calculating bounds, using USA default view:', boundsError);
          map.setCamera({
            center: [-98.5795, 39.8283], // Center of USA
            zoom: 3
          });
        }
      } else {
        // No valid coordinates, default to USA view
        map.setCamera({
          center: [-98.5795, 39.8283], // Center of USA
          zoom: 3
        });
      }

      console.log('Successfully displayed users on map');

    } catch (error) {
      console.error('Error in displayUsersOnMap:', error);
      throw new Error(`Map display failed: ${error.message}`);
    }
  };

  // Utility functions for popup styling
  const getBorderColorHex = (borderColor) => {
    switch (borderColor) {
      case 'green':
        return '#107c10';
      case 'orange':
        return '#ff8c00';
      case 'gray':
      default:
        return '#8a8886';
    }
  };

  const getDefaultAvatarBase64 = () => {
    const svg = `
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="30" r="30" fill="#6264a7"/>
        <circle cx="30" cy="22" r="9" fill="white"/>
        <path d="M12 48c0-9.941 8.059-18 18-18s18 8.059 18 18" fill="white"/>
      </svg>
    `;
    return btoa(svg);
  };

  const handleSearch = () => {
    console.log(`Search clicked. Map instance exists: ${!!mapInstanceRef.current}, Map ready: ${mapReady}`);
    
    if (!mapInstanceRef.current) {
      console.log('Map not initialized, initializing now...');
      setMapReady(false);
      initializeMap();
      // Wait longer for map initialization
      setTimeout(() => {
        if (mapReady || mapInstanceRef.current) {
          console.log('Map ready after initialization delay');
          fetchMapData(userEmail);
        } else {
          console.log('Force fetching data even if map not confirmed ready');
          fetchMapData(userEmail);
        }
      }, 5000);
    } else if (!mapReady) {
      console.log('Map exists but not ready, reinitializing...');
      // Force reinitialize if map exists but not ready
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.dispose();
        } catch (e) {
          console.warn('Error disposing map:', e);
        }
        mapInstanceRef.current = null;
      }
      setMapReady(false);
      initializeMap();
      setTimeout(() => {
        fetchMapData(userEmail);
      }, 5000);
    } else {
      console.log('Map is ready, fetching data immediately...');
      fetchMapData(userEmail);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getLocationStats = () => {
    const stats = {
      address: 0,
      phone: 0,
      timezone: 0
    };

    mapData.forEach((userLocationData) => {
      stats[userLocationData.location_type] = (stats[userLocationData.location_type] || 0) + 1;
    });

    return stats;
  };

  const stats = getLocationStats();

  // Initialize map when component mounts
  useEffect(() => {
    // Add a small delay to ensure the DOM is fully rendered
    const timer = setTimeout(() => {
      if (mapRef.current && !mapInstanceRef.current) {
        console.log('Initializing map on component mount...');
        initializeMap();
      }
    }, 100);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Second attempt to initialize map if first attempt failed
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current && !mapInstanceRef.current) {
        console.log('Second attempt to initialize map...');
        initializeMap();
      }
    }, 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="tab-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="tab-header">
        <h1 className="tab-title">Team Map View</h1>
        <div className="search-container">
          <input
            type="email"
            className="search-input"
            placeholder="Enter user email (e.g., user@company.com)"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <button
            className="search-button"
            onClick={handleSearch}
            disabled={loading || !userEmail}
          >
            {loading ? 'Loading...' : 'Show on Map'}
          </button>
          {/* Debug buttons - only shown when REACT_APP_DEBUG=true */}
          {getConfig().debug && (
            <>
              <button
                className="search-button"
                onClick={() => {
                  console.log('Testing map display...');
                  if (mapInstanceRef.current) {
                    try {
                      console.log('Map instance exists, testing camera...');
                      const camera = mapInstanceRef.current.getCamera();
                      console.log('Current camera:', camera);
                      
                      console.log('Setting camera to center of USA...');
                      mapInstanceRef.current.setCamera({
                        center: [-98.5795, 39.8283],
                        zoom: 4,
                        duration: 2000
                      });
                      
                      setError(null);
                      console.log('Map test completed successfully');
                    } catch (e) {
                      console.error('Map test failed:', e);
                      setError(`Map test failed: ${e.message}`);
                    }
                  } else {
                    console.log('No map instance, trying to initialize...');
                    initializeMap();
                  }
                }}
                style={{ marginLeft: '10px', backgroundColor: '#0078d4' }}
              >
                Test Map
              </button>
              <button
                className="search-button"
                onClick={() => {
                  console.log('Force reinitializing map...');
                  if (mapInstanceRef.current) {
                    try {
                      mapInstanceRef.current.dispose();
                    } catch (e) {
                      console.warn('Error disposing map:', e);
                    }
                    mapInstanceRef.current = null;
                  }
                  setMapReady(false);
                  setError(null);
                  setTimeout(() => {
                    initializeMap();
                  }, 100);
                }}
                style={{ marginLeft: '10px', backgroundColor: '#8a8886' }}
              >
                Reset Map
              </button>
            </>
          )}
        </div>
      </div>

      <div className="tab-content map-view-layout" style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', position: 'relative' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '20px' }}>
          {/* Debug Information - only shown when REACT_APP_DEBUG=true */}
          {getConfig().debug && (
            <div style={{ 
              background: '#f3f2f1', 
              padding: '10px', 
              margin: '10px 0', 
              borderRadius: '4px',
              fontSize: '12px',
              color: '#605e5c'
            }}>
              <strong>Debug Info:</strong> Map Instance: {mapInstanceRef.current ? '✓' : '✗'} | 
              Map Ready: {mapReady ? '✓' : '✗'} | 
              Zoom Level: {currentZoom.toFixed(1)} |
              Pending Data: {pendingMapData ? pendingMapData.length : 0} users |
              API Key: {getConfig().azureMapsApiKey ? 'Configured' : 'Missing'}
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {!mapData.length && !loading && !error && (
            <div className="info-message">
              Enter a user's email address above to view their team's locations on the map.
              Team members will be displayed with colored borders based on location accuracy.
            </div>
          )}

          {loading && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Fetching team location data...</p>
            </div>
          )}

          <div className="map-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {mapData.length > 0 && (
              <div className="map-controls">
                <div className="legend">
                  <h4 style={{ margin: 0, color: '#323130' }}>Location Accuracy:</h4>
                  <div className="legend-item">
                    <div className="legend-dot green"></div>
                    <span>Address/Office ({stats.address || 0})</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot orange"></div>
                    <span>Phone Approximation ({stats.phone || 0})</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot gray"></div>
                    <span>Timezone Only ({stats.timezone || 0})</span>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#605e5c' }}>
                  Total team members: {mapData.length}
                </div>
              </div>
            )}
            
            <div 
              ref={mapRef}
              className="azure-map"
              style={{ 
                flex: 1,
                width: '100%',
                backgroundColor: '#f3f2f1',
                minHeight: mapData.length > 0 ? '600px' : '500px',
                position: 'relative',
                zIndex: 1
              }}
            ></div>
            
            {/* Fallback: Show users in list format if map fails */}
            {mapData.length > 0 && error && error.includes('Map') && (
              <div style={{ 
                position: 'absolute', 
                top: '80px', 
                left: '20px', 
                right: '20px', 
                bottom: '20px',
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                overflow: 'auto'
              }}>
                <h3>Team Members (Map View Unavailable)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                  {mapData.map((userLocationData, index) => {
                    const { user, location, border_color, location_type } = userLocationData;
                    return (
                      <div 
                        key={user.id || index}
                        style={{
                          border: `2px solid ${getBorderColorHex(border_color)}`,
                          borderRadius: '8px',
                          padding: '15px',
                          backgroundColor: '#f9f9f9'
                        }}
                      >
                        <img
                          src={`${getConfig().backendUrl}/api/user-photo/${user.id}`}
                          alt={user.displayName}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            marginBottom: '10px',
                            border: `2px solid ${getBorderColorHex(border_color)}`
                          }}
                          onError={(e) => {
                            e.target.src = `data:image/svg+xml;base64,${getDefaultAvatarBase64()}`;
                          }}
                        />
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{user.displayName}</div>
                        {user.jobTitle && <div style={{ fontSize: '12px', color: '#605e5c', marginBottom: '3px' }}>{user.jobTitle}</div>}
                        {user.department && <div style={{ fontSize: '12px', color: '#8a8886', marginBottom: '3px' }}>{user.department}</div>}
                        {location && <div style={{ fontSize: '11px', color: '#8a8886' }}>📍 {location.address}</div>}
                        <div className={`location-type-badge ${location_type}`} style={{ marginTop: '8px' }}>
                          {location_type === 'address' && 'Address'}
                          {location_type === 'phone' && 'Phone Approx'}
                          {location_type === 'timezone' && 'Timezone'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Chat Interface */}
        <ChatInterface mapData={mapData} />
      </div>
    </div>
  );
};

export default MapViewTab;
