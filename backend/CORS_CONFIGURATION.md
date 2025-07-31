# Azure App Service CORS Configuration Guide

## Overview
The Flask application has been updated to rely on Azure App Service's built-in CORS configuration instead of hardcoded origins. This provides better flexibility and security.

## Azure App Service CORS Configuration

### Method 1: Azure Portal
1. Go to your Azure App Service in the Azure Portal
2. In the left sidebar, navigate to **API** > **CORS**
3. Add your allowed origins:
   - `https://whereat-frontend.azurewebsites.net` (your frontend URL)
   - `http://localhost:3000` (for local development)
   - `http://localhost:3001` (for local development)
4. Check **Enable Access-Control-Allow-Credentials** if needed
5. Click **Save**

### Method 2: Azure CLI
```bash
# Set CORS origins for your app service
az webapp cors add --resource-group <your-resource-group> --name <your-app-name> --allowed-origins https://whereat-frontend.azurewebsites.net http://localhost:3000 http://localhost:3001

# Enable credentials if needed
az webapp cors update --resource-group <your-resource-group> --name <your-app-name> --enable-access-control-allow-credentials true
```

### Method 3: ARM Template / Bicep
```json
{
  "type": "Microsoft.Web/sites/config",
  "apiVersion": "2021-02-01",
  "name": "[concat(parameters('siteName'), '/web')]",
  "properties": {
    "cors": {
      "allowedOrigins": [
        "https://whereat-frontend.azurewebsites.net",
        "http://localhost:3000",
        "http://localhost:3001"
      ],
      "supportCredentials": true
    }
  }
}
```

## Application Changes Made

### 1. Environment-Aware CORS Configuration
The Flask app now detects if it's running on Azure App Service using the `WEBSITE_SITE_NAME` environment variable:
- **On Azure**: Minimal CORS configuration, relies on Azure App Service CORS settings
- **Local Development**: Full CORS configuration for localhost origins

### 2. Simplified CORS Handling
- Removed hardcoded production URLs
- Only handles CORS in local development
- Azure App Service handles all CORS concerns in production

### 3. Cleaner web.config
- Removed CORS headers from web.config
- Let Azure App Service handle CORS at the platform level

## Benefits

1. **Flexibility**: Change CORS origins without code changes
2. **Security**: Better control over allowed origins
3. **Maintainability**: No hardcoded URLs in source code
4. **Azure Integration**: Leverages Azure App Service features

## Testing

### Local Development
The app automatically detects local environment and applies appropriate CORS settings for localhost.

### Azure Deployment
After deploying, configure CORS origins in Azure App Service settings as described above.

## Troubleshooting

1. **CORS errors persist**: Ensure Azure App Service CORS is configured correctly
2. **Preflight requests fail**: Check that OPTIONS method is allowed
3. **Credentials issues**: Enable Access-Control-Allow-Credentials in Azure settings

## Environment Variables
The app uses `WEBSITE_SITE_NAME` to detect Azure App Service environment. This is automatically set by Azure.
