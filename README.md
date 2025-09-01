# Where@
is an innovative proof-of-concept app designed to revolutionize how we visualize, connect, and strategically leverage our organizational talent. By mapping our company's org chart onto a live, interactive map, "Where@" provides an immediate, dynamic view of our team's geographic footprint.

Leveraging AI, "Where@" moves beyond simple visualization to offer powerful, predictive insights.
The platform can:
- Intelligently recommend the optimal team member for on-site client meetings (QBRs) based on proximity and expertise, even with travel constraints.
- Optimize business travel by suggesting efficient itineraries and identifying collaboration opportunities with nearby team members and customers.
- Predictively analyze and suggest ideal "POD" (team) structures and sales territory allocations for maximum market penetration.
- Uncover new strategic opportunities by visualizing skill concentrations and identifying where local expertise can meet immediate customer needs.

In essence, "Where@" is more than a map; it's a strategic tool that drives efficiency, reduces costs, fosters stronger collaboration, and empowers smarter, data-driven decisions across the entire organization. We believe this tangible solution is ready for production, promising to unlock significant value and new insights for our company.

<img width="1248" height="832" alt="Where@1s" src="https://github.com/user-attachments/assets/7a69e9c0-e74a-4ee8-a16c-1d9e847d79cc" />
<img width="1248" height="832" alt="Where@2s" src="https://github.com/user-attachments/assets/58b00429-0913-48f7-abae-90884faca76c" />
<img width="1248" height="831" alt="Where@6s" src="https://github.com/user-attachments/assets/15d30f4a-2fab-4969-a1a2-3ec6d0043e36" />
<img width="1248" height="832" alt="Where@5s" src="https://github.com/user-attachments/assets/b341dfc1-614c-4fe4-9c70-bbce13c20160" />
<img width="1248" height="832" alt="Where@4s" src="https://github.com/user-attachments/assets/19b751fb-8b01-4970-841e-2b7903cec176" />
<img width="1248" height="832" alt="Where@3s" src="https://github.com/user-attachments/assets/d3954c95-d298-4ee0-95d6-8275c0def608" />

## Architecture
- **Backend**: Python Flask API querying the Microsoft Graph API
- **Frontend**: React with Microsoft Teams SDK
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
4. Run: `npm start` or `npm run dev`

## Configuration
Create a `.env` file in the backend directory with:
```
AZURE_CLIENT_ID=your_azure_client_id
AZURE_CLIENT_SECRET=your_azure_client_secret
AZURE_TENANT_ID=your_azure_tenant_id
AZURE_MAPS_API_KEY=your_azure_maps_api_key
```
