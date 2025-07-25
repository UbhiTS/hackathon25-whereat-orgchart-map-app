# Teams Org Map App

A Microsoft Teams application that displays organizational hierarchy in two views:
1. **Org Chart Tab**: Tree structure showing user hierarchy recursively
2. **Map View Tab**: Bing Maps showing users with profile pictures as location pins

## Features

- Fetches user data from Microsoft Entra ID (Azure AD)
- Displays recursive organizational hierarchy
- Shows users on map based on location (home/business/office)
- Color-coded profile picture borders:
  - Green: Users with address information
  - Orange: Users with phone number approximation
  - Gray: Users with timezone-only location

## Architecture

- **Backend**: Python Flask API
- **Frontend**: React with Microsoft Teams SDK
- **Authentication**: Azure AD via Microsoft Graph API
- **Maps**: Azure Maps integration

## Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- Azure AD app registration
- Azure Maps account

### Backend Setup
1. Navigate to `/backend`
2. Install dependencies: `pip install -r requirements.txt`
3. Configure environment variables in `.env`
4. Run: `python app.py`

### Frontend Setup
1. Navigate to `/frontend`
2. Install dependencies: `npm install`
3. Configure Teams app manifest
4. Run: `npm start`

## Configuration

Create a `.env` file in the backend directory with:
```
AZURE_CLIENT_ID=your_azure_client_id
AZURE_CLIENT_SECRET=your_azure_client_secret
AZURE_TENANT_ID=your_azure_tenant_id
AZURE_MAPS_API_KEY=your_azure_maps_api_key
```
