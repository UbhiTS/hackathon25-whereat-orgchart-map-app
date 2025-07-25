# Installation and Setup Guide

## Prerequisites

1. **Azure AD App Registration**
2. **Bing Maps API Key**
3. **Node.js 16+**
4. **Python 3.8+**

## Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure:
   - Name: "Teams Org Map App"
   - Supported account types: "Accounts in this organizational directory only"
   - Redirect URI: Leave blank for now
5. Click **Register**
6. Note down:
   - **Application (client) ID**
   - **Directory (tenant) ID**
7. Go to **Certificates & secrets** > **New client secret**
8. Create a secret and note down the **Value**
9. Go to **API permissions** > **Add a permission**
10. Add Microsoft Graph **Application permissions** (not Delegated):
    - `User.Read.All` (Application)
    - `Directory.Read.All` (Application)
    - `Organization.Read.All` (Application)
    - `People.Read.All` (Application)
11. Click **Grant admin consent for [Your Organization]**
12. Ensure all permissions show "Granted for [Your Organization]" with green checkmarks

## Azure Maps API Key

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Create a resource** > Search for "Azure Maps"
3. Click **Azure Maps** > **Create**
4. Configure:
   - Subscription: Your Azure subscription
   - Resource group: Create new or use existing
   - Name: "teams-org-map-maps"
   - Pricing tier: "Gen1 (S0)" or "Gen2"
   - Region: Choose appropriate region
5. Click **Review + create** > **Create**
6. Once deployed, go to the resource
7. Navigate to **Authentication** > **Primary Key**
8. Copy the **Primary Key** value

## Backend Setup

1. Navigate to backend directory:
   ```powershell
   cd backend
   ```

2. Create virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

4. Create `.env` file from template:
   ```powershell
   Copy-Item .env.example .env
   ```

5. Edit `.env` file with your credentials:
   ```
   AZURE_CLIENT_ID=your_azure_client_id_here
   AZURE_CLIENT_SECRET=your_azure_client_secret_here
   AZURE_TENANT_ID=your_azure_tenant_id_here
   AZURE_MAPS_API_KEY=your_azure_maps_api_key_here
   ```

6. Start the backend server:
   ```powershell
   python app.py
   ```

## Frontend Setup

1. Navigate to frontend directory:
   ```powershell
   cd frontend
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Create `.env` file from template:
   ```powershell
   Copy-Item .env.example .env
   ```

4. Edit `.env` file with your Azure Maps API key:
   ```
   REACT_APP_AZURE_MAPS_API_KEY=your_azure_maps_api_key_here
   ```

5. Start the frontend:
   ```powershell
   npm start
   ```

## Teams App Setup

1. Update the manifest:
   - Edit `teams-manifest/manifest.json`
   - Replace `yourdomain.com` with your actual domain
   - Replace `your-azure-app-id-here` with your Azure app ID

2. Create app icons:
   - Add `icon-color.png` (192x192px)
   - Add `icon-outline.png` (32x32px, transparent)

3. Package the app:
   - Zip the contents of `teams-manifest` folder
   - Upload to Teams via Teams Admin Center or App Studio

## Testing

1. Backend health check:
   ```
   http://localhost:5000/health
   ```

2. Backend authentication test:
   ```
   http://localhost:5000/api/test-auth
   ```

3. Frontend:
   ```
   http://localhost:3000
   ```

4. Frontend map diagnostic:
   ```
   http://localhost:3000/map-diagnostic
   ```

5. Test with a valid user email from your organization

## Troubleshooting

### Common Issues

1. **403 Forbidden Error**:
   - Verify Azure AD app has **Application permissions** (not Delegated)
   - Ensure admin consent has been granted
   - Check that permissions show green checkmarks in Azure portal
   - Verify the app is using client credentials flow

2. **Authentication errors**: 
   - Double-check Azure AD app credentials in .env file
   - Ensure AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET are correct
   - Test with `/api/test-auth` endpoint

3. **User not found errors**:
   - Verify the user email exists in your Azure AD tenant
   - Check if the user is in the correct tenant
   - Ensure the user account is active

4. **CORS errors**: Check Flask CORS configuration
5. **Map not loading**: Verify Azure Maps API key
6. **No user data**: Check Microsoft Graph permissions
7. **Map shows users count but no map**: Check Azure Maps configuration

### Map-Specific Issues

1. **"Failed to connect to server" but shows user count**:
   - Backend is working, frontend map initialization failed
   - Check Azure Maps API key in frontend/.env
   - Visit http://localhost:3000/map-diagnostic for detailed diagnosis

2. **Azure Maps not loading**:
   - Verify REACT_APP_AZURE_MAPS_API_KEY in frontend/.env
   - Check browser console for JavaScript errors
   - Ensure Azure Maps resource is properly configured in Azure Portal

3. **Map shows but no pins**:
   - Check browser console for errors
   - Verify users have location data (address, phone, or timezone)
   - Check if Azure Maps API key has proper permissions

### Debugging Steps

1. **Test Authentication**:
   ```bash
   curl http://localhost:5000/api/test-auth
   ```

2. **Check Azure AD App Permissions**:
   - Go to Azure Portal > Azure Active Directory > App registrations
   - Find your app > API permissions
   - Ensure all permissions are "Granted" with green checkmarks

3. **Verify Environment Variables**:
   ```bash
   # In backend directory
   python -c "
   import os
   from dotenv import load_dotenv
   load_dotenv()
   print('Client ID:', os.getenv('AZURE_CLIENT_ID'))
   print('Tenant ID:', os.getenv('AZURE_TENANT_ID'))
   print('Client Secret exists:', bool(os.getenv('AZURE_CLIENT_SECRET')))
   "
   ```

### Required Azure AD App Permissions

Your Azure AD app must have these **Application permissions**:
- Microsoft Graph > User.Read.All
- Microsoft Graph > Directory.Read.All  
- Microsoft Graph > Organization.Read.All
- Microsoft Graph > People.Read.All

**Important**: These must be Application permissions, not Delegated permissions, and admin consent must be granted.

### Logs

- Backend logs: Check Flask console output
- Frontend logs: Check browser developer console
- Azure logs: Use Azure Monitor for production issues
