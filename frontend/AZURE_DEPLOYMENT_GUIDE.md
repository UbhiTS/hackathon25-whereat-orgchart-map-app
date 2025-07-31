# Azure App Service Frontend Configuration Guide

## Problem Solved
React environment variables (`REACT_APP_*`) are compiled at build time, not runtime. When Azure App Service builds your React app, it doesn't have access to the App Service environment variables during the build process.

## Solution: Runtime Environment Variable Injection

### How It Works
1. **Express Server**: Modified `server.js` to inject Azure App Service environment variables at runtime
2. **Config Endpoint**: `/config.js` endpoint serves environment variables as JavaScript
3. **Runtime Config**: React components use runtime config instead of build-time environment variables
4. **Fallback Support**: Still works with traditional `.env` files for local development

### Files Modified

#### 1. `/frontend/server.js`
- Added `/config.js` endpoint to serve environment variables
- Modified index.html serving to inject config script
- Added environment variable logging for debugging

#### 2. `/frontend/src/config.js` (NEW)
- Utility functions to access runtime configuration
- Fallback to build-time environment variables
- Helper functions for easy usage

#### 3. Updated Components
- `MapViewTab.js` - Updated all environment variable usage
- `MapDiagnostic.js` - Updated API key access
- `OrgChartTab.js` - Updated backend URL access  
- `TreeNode.js` - Updated backend URL access

### Azure App Service Configuration

#### Environment Variables to Set
In your Azure App Service → **Configuration** → **Application Settings**:

| Name | Value |
|------|-------|
| `REACT_APP_AZURE_MAPS_API_KEY` | `` |
| `REACT_APP_BACKEND_URL` | `` |

#### Deployment Steps
1. **Push your code** to Azure App Service
2. **Set environment variables** in Azure portal as shown above
3. **Restart the app service** to apply new environment variables
4. **Test the application** - environment variables should now be available

### Testing

#### Local Development
- Environment variables from `.env` file are used as fallback
- No additional configuration needed for local development

#### Production Verification
1. **Check config endpoint**: Visit `https://your-app.azurewebsites.net/config.js`
   - Should show: `window.ENV = {"REACT_APP_AZURE_MAPS_API_KEY":"FJhGo4905...","REACT_APP_BACKEND_URL":"https://whereat-backend.azurewebsites.net"};`

2. **Check browser console**: 
   - Open browser dev tools
   - Type `window.ENV` in console
   - Should show your configuration object

3. **Check server logs**:
   - Azure App Service logs should show:
   ```
   Environment variables:
   - REACT_APP_AZURE_MAPS_API_KEY: Set
   - REACT_APP_BACKEND_URL: Set
   ```

### Benefits

1. **Runtime Configuration**: Environment variables are read at runtime, not build time
2. **No Rebuild Required**: Change environment variables without rebuilding the app
3. **Azure Integration**: Works seamlessly with Azure App Service configuration
4. **Fallback Support**: Still works with local `.env` files
5. **Security**: No environment variables baked into build artifacts

### Troubleshooting

#### Frontend can't connect to backend
1. **Check environment variables** in Azure App Service configuration
2. **Verify config endpoint**: Visit `/config.js` to see current values
3. **Check server logs** for environment variable status
4. **Restart app service** after changing environment variables

#### API Key not working
1. **Verify Azure Maps key** is correctly set in Azure App Service
2. **Check config endpoint** to confirm key is being served
3. **Verify no trailing spaces** in environment variable values

#### CORS Issues
1. **Ensure backend CORS is configured** for your frontend domain
2. **Check Azure App Service CORS settings** if using Azure CORS
3. **Verify backend URL** is correct in environment variables

### Code Usage

Instead of:
```javascript
const apiKey = process.env.REACT_APP_AZURE_MAPS_API_KEY;
const backendUrl = process.env.REACT_APP_BACKEND_URL;
```

Use:
```javascript
import { getConfig } from '../config';

const config = getConfig();
const apiKey = config.azureMapsApiKey;
const backendUrl = config.backendUrl;
```
