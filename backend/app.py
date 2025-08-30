from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
import json
import re
import phonenumbers
from phonenumbers import geocoder, carrier
import logging
from datetime import datetime
import asyncio
from llm_service import llm_service

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure CORS - Let Azure App Service handle CORS configuration
# For local development, allow all origins
if os.getenv('WEBSITE_SITE_NAME'):
    # Running on Azure App Service - rely on Azure CORS configuration
    CORS(app, resources={r"/api/*": {"origins": "*"}})
else:
    # Local development - allow all origins for easier testing
    CORS(app, 
         origins="*",
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
         supports_credentials=False)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Handle preflight OPTIONS requests for local development
# Remove manual CORS headers since flask-cors handles it
# @app.before_request
def handle_preflight():
    if request.method == "OPTIONS" and not os.getenv('WEBSITE_SITE_NAME'):
        # Only handle OPTIONS requests in local development
        response = jsonify()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add('Access-Control-Allow-Headers', "Content-Type,Authorization,X-Requested-With")
        response.headers.add('Access-Control-Allow-Methods', "GET,POST,PUT,DELETE,OPTIONS")
        return response

# Remove manual CORS headers since flask-cors handles it
@app.after_request
def after_request(response):
    if not os.getenv('WEBSITE_SITE_NAME'):
        # Only add headers in local development
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Azure AD configuration
AZURE_CLIENT_ID = os.getenv('AZURE_CLIENT_ID')
AZURE_CLIENT_SECRET = os.getenv('AZURE_CLIENT_SECRET')
AZURE_TENANT_ID = os.getenv('AZURE_TENANT_ID')
AZURE_MAPS_API_KEY = os.getenv('AZURE_MAPS_API_KEY')

class GraphAPIClient:
    def __init__(self):
        self.access_token = None
        
    def get_access_token(self):
        """Get access token for Microsoft Graph API"""
        url = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}/oauth2/v2.0/token"
        
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        data = {
            'client_id': AZURE_CLIENT_ID,
            'client_secret': AZURE_CLIENT_SECRET,
            'scope': 'https://graph.microsoft.com/.default',
            'grant_type': 'client_credentials'
        }
        
        try:
            response = requests.post(url, headers=headers, data=data)
            response.raise_for_status()
            token_data = response.json()
            self.access_token = token_data['access_token']
            logger.info("Successfully obtained access token")
            return self.access_token
        except requests.exceptions.RequestException as e:
            logger.error(f"Error getting access token: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response content: {e.response.text}")
            return None
    
    def make_graph_request(self, endpoint, params=None):
        """Make a request to Microsoft Graph API"""
        if not self.access_token:
            if not self.get_access_token():
                return None
            
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        url = f"https://graph.microsoft.com/v1.0{endpoint}"
        
        try:
            response = requests.get(url, headers=headers, params=params)
            
            # Handle different error cases
            if response.status_code == 401:
                logger.warning("Access token expired, refreshing...")
                self.access_token = None
                if self.get_access_token():
                    headers['Authorization'] = f'Bearer {self.access_token}'
                    response = requests.get(url, headers=headers, params=params)
                else:
                    logger.error("Failed to refresh access token")
                    return None
            
            if response.status_code == 403:
                logger.error(f"Forbidden access to {endpoint}. Check app permissions and admin consent.")
                logger.error(f"Response: {response.text}")
                return None
            
            if response.status_code == 404:
                logger.warning(f"Resource not found: {endpoint}")
                return None
                
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error making Graph API request to {endpoint}: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response status: {e.response.status_code}")
                logger.error(f"Response content: {e.response.text}")
            return None
    
    def get_user_by_email(self, email):
        """Get user details by email"""
        endpoint = f"/users/{email}"
        params = {
            '$select': 'id,displayName,mail,userPrincipalName,jobTitle,department,officeLocation,businessPhones,mobilePhone,streetAddress,city,state,postalCode,country,usageLocation,timeZone'
        }
        return self.make_graph_request(endpoint, params)
    
    def get_user_manager(self, user_id):
        """Get user's manager"""
        endpoint = f"/users/{user_id}/manager"
        params = {
            '$select': 'id,displayName,mail,userPrincipalName,jobTitle,department'
        }
        return self.make_graph_request(endpoint, params)
    
    def get_user_direct_reports(self, user_id):
        """Get user's direct reports"""
        endpoint = f"/users/{user_id}/directReports"
        params = {
            '$select': 'id,displayName,mail,userPrincipalName,jobTitle,department,officeLocation,businessPhones,mobilePhone,streetAddress,city,state,postalCode,country,usageLocation,timeZone'
        }
        return self.make_graph_request(endpoint, params)
    
    def get_user_photo(self, user_id):
        """Get user's profile photo"""
        endpoint = f"/users/{user_id}/photo/$value"
        
        if not self.access_token:
            self.get_access_token()
            
        headers = {
            'Authorization': f'Bearer {self.access_token}'
        }
        
        url = f"https://graph.microsoft.com/v1.0{endpoint}"
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                return response.content
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"Error getting user photo: {e}")
            return None

class LocationService:
    def __init__(self, azure_maps_api_key):
        self.api_key = azure_maps_api_key
    
    def geocode_address(self, address):
        """Convert address to coordinates using Azure Maps"""
        if not address:
            return None
            
        url = "https://atlas.microsoft.com/search/address/json"
        params = {
            'api-version': '1.0',
            'subscription-key': self.api_key,
            'query': address,
            'limit': 1
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get('results') and len(data['results']) > 0:
                result = data['results'][0]
                position = result['position']
                return {
                    'latitude': position['lat'],
                    'longitude': position['lon'],
                    'address': result.get('address', {}).get('freeformAddress', address)
                }
        except Exception as e:
            logger.error(f"Error geocoding address {address}: {e}")
            
        return None
    
    def get_location_from_phone(self, phone_number):
        """Approximate location from phone number"""
        if not phone_number:
            logger.info("No phone number provided")
            return None
            
        try:
            logger.info(f"Attempting to parse phone number: {phone_number}")
            
            # Clean up phone number - remove common formatting
            cleaned_phone = re.sub(r'[^\d+]', '', phone_number)
            if not cleaned_phone.startswith('+') and len(cleaned_phone) == 10:
                # Assume US number if 10 digits without country code
                cleaned_phone = '+1' + cleaned_phone
            elif not cleaned_phone.startswith('+') and len(cleaned_phone) == 11 and cleaned_phone.startswith('1'):
                # US number with leading 1
                cleaned_phone = '+' + cleaned_phone
                
            logger.info(f"Cleaned phone number: {cleaned_phone}")
            
            # Parse phone number - try with US default first
            try:
                parsed_number = phonenumbers.parse(cleaned_phone, "US")
            except:
                # Fallback to original parsing
                parsed_number = phonenumbers.parse(phone_number, None)
                
            logger.info(f"Successfully parsed phone number: {parsed_number}")
            
            # Get country/region from phone number
            country = geocoder.description_for_number(parsed_number, "en")
            logger.info(f"Got country from phone number: {country}")
            
            if country:
                # Try to geocode the country
                location = self.geocode_address(country)
                logger.info(f"Geocoded location for {country}: {location}")
                return location
            else:
                logger.warning(f"Could not determine country from phone number: {phone_number}")
                
        except Exception as e:
            logger.error(f"Error getting location from phone {phone_number}: {e}")
            
        return None
    
    def get_timezone_location(self, timezone):
        """Get approximate location from timezone"""
        timezone_locations = {
            'UTC-12:00': {'latitude': -11.0, 'longitude': -170.0, 'name': 'Baker Island'},
            'UTC-11:00': {'latitude': 21.3, 'longitude': -157.8, 'name': 'Hawaii'},
            'UTC-10:00': {'latitude': 21.3, 'longitude': -157.8, 'name': 'Hawaii-Aleutian'},
            'UTC-09:00': {'latitude': 61.2, 'longitude': -149.9, 'name': 'Alaska'},
            'UTC-08:00': {'latitude': 37.7, 'longitude': -122.4, 'name': 'Pacific Time'},
            'UTC-07:00': {'latitude': 39.7, 'longitude': -104.9, 'name': 'Mountain Time'},
            'UTC-06:00': {'latitude': 41.9, 'longitude': -87.6, 'name': 'Central Time'},
            'UTC-05:00': {'latitude': 40.7, 'longitude': -74.0, 'name': 'Eastern Time'},
            'UTC-04:00': {'latitude': 45.5, 'longitude': -73.6, 'name': 'Atlantic Time'},
            'UTC-03:00': {'latitude': -23.5, 'longitude': -46.6, 'name': 'São Paulo'},
            'UTC-02:00': {'latitude': -22.9, 'longitude': -43.2, 'name': 'Rio de Janeiro'},
            'UTC-01:00': {'latitude': 32.3, 'longitude': -16.3, 'name': 'Azores'},
            'UTC+00:00': {'latitude': 51.5, 'longitude': -0.1, 'name': 'London'},
            'UTC+01:00': {'latitude': 52.5, 'longitude': 13.4, 'name': 'Berlin'},
            'UTC+02:00': {'latitude': 41.9, 'longitude': 12.5, 'name': 'Rome'},
            'UTC+03:00': {'latitude': 55.8, 'longitude': 37.6, 'name': 'Moscow'},
            'UTC+04:00': {'latitude': 25.3, 'longitude': 55.3, 'name': 'Dubai'},
            'UTC+05:00': {'latitude': 28.6, 'longitude': 77.2, 'name': 'Delhi'},
            'UTC+06:00': {'latitude': 23.8, 'longitude': 90.4, 'name': 'Dhaka'},
            'UTC+07:00': {'latitude': 13.8, 'longitude': 100.5, 'name': 'Bangkok'},
            'UTC+08:00': {'latitude': 39.9, 'longitude': 116.4, 'name': 'Beijing'},
            'UTC+09:00': {'latitude': 35.7, 'longitude': 139.7, 'name': 'Tokyo'},
            'UTC+10:00': {'latitude': -33.9, 'longitude': 151.2, 'name': 'Sydney'},
            'UTC+11:00': {'latitude': -37.8, 'longitude': 144.9, 'name': 'Melbourne'},
            'UTC+12:00': {'latitude': -36.8, 'longitude': 174.7, 'name': 'Auckland'},
        }
        
        if timezone in timezone_locations:
            loc = timezone_locations[timezone]
            return {
                'latitude': loc['latitude'],
                'longitude': loc['longitude'],
                'address': loc['name']
            }
        
        return None

# Initialize services
graph_client = GraphAPIClient()
location_service = LocationService(AZURE_MAPS_API_KEY)

def build_org_hierarchy(root_user_email, visited=None):
    """Recursively build organization hierarchy"""
    if visited is None:
        visited = set()
    
    if root_user_email in visited:
        return None
    
    visited.add(root_user_email)
    
    # Get root user details
    user_data = graph_client.get_user_by_email(root_user_email)
    if not user_data:
        return None
    
    # Get direct reports
    direct_reports = graph_client.get_user_direct_reports(user_data['id'])
    
    hierarchy = {
        'user': user_data,
        'children': []
    }
    
    if direct_reports and direct_reports.get('value'):
        for report in direct_reports['value']:
            if report.get('mail'):
                child_hierarchy = build_org_hierarchy(report['mail'], visited.copy())
                if child_hierarchy:
                    hierarchy['children'].append(child_hierarchy)
    
    return hierarchy

def get_user_location_info(user):
    """Get location information for a user with priority: address > phone > timezone"""
    location_data = {
        'user': user,
        'location': None,
        'border_color': 'gray',
        'location_type': 'timezone'
    }
    
    # Try to build address from user fields
    address_parts = []
    if user.get('streetAddress'):
        address_parts.append(user['streetAddress'])
    if user.get('city'):
        address_parts.append(user['city'])
    if user.get('state'):
        address_parts.append(user['state'])
    if user.get('country'):
        address_parts.append(user['country'])
    
    # Priority 1: Try address
    if address_parts:
        address = ', '.join(address_parts)
        location = location_service.geocode_address(address)
        if location:
            location_data['location'] = location
            location_data['border_color'] = 'green'
            location_data['location_type'] = 'address'
            return location_data
    
    # Priority 2: Try office location
    if user.get('officeLocation'):
        location = location_service.geocode_address(user['officeLocation'])
        if location:
            location_data['location'] = location
            location_data['border_color'] = 'green'
            location_data['location_type'] = 'office'
            return location_data
    
    # Priority 3: Try phone number
    phone = user.get('mobilePhone') or (user.get('businessPhones') and user['businessPhones'][0])
    logger.info(f"Checking phone for user {user.get('displayName', 'Unknown')}: mobile={user.get('mobilePhone')}, business={user.get('businessPhones')}")
    if phone:
        logger.info(f"Found phone number for {user.get('displayName', 'Unknown')}: {phone}")
        location = location_service.get_location_from_phone(phone)
        if location:
            logger.info(f"Successfully got location from phone for {user.get('displayName', 'Unknown')}: {location}")
            location_data['location'] = location
            location_data['border_color'] = 'orange'
            location_data['location_type'] = 'phone'
            return location_data
        else:
            logger.warning(f"Failed to get location from phone for {user.get('displayName', 'Unknown')}: {phone}")
    else:
        logger.info(f"No phone number available for user {user.get('displayName', 'Unknown')}")
    
    # Priority 4: Use timezone
    timezone = user.get('timeZone')
    if timezone:
        location = location_service.get_timezone_location(timezone)
        if location:
            location_data['location'] = location
            location_data['border_color'] = 'gray'
            location_data['location_type'] = 'timezone'
            return location_data
    
    return location_data

def flatten_hierarchy_for_map(hierarchy, users_list=None):
    """Flatten hierarchy tree to get all users for map display"""
    if users_list is None:
        users_list = []
    
    if hierarchy and hierarchy.get('user'):
        user_location = get_user_location_info(hierarchy['user'])
        users_list.append(user_location)
    
    if hierarchy and hierarchy.get('children'):
        for child in hierarchy['children']:
            flatten_hierarchy_for_map(child, users_list)
    
    return users_list

@app.route('/api/org-hierarchy/<email>')
def get_org_hierarchy(email):
    """Get organization hierarchy starting from given email"""
    try:
        hierarchy = build_org_hierarchy(email)
        if hierarchy:
            return jsonify({
                'success': True,
                'data': hierarchy
            })
        else:
            return jsonify({
                'success': False,
                'error': 'User not found or no access'
            }), 404
    except Exception as e:
        logger.error(f"Error getting org hierarchy: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/map-data/<email>')
def get_map_data(email):
    """Get all users in hierarchy with location data for map display"""
    try:
        hierarchy = build_org_hierarchy(email)
        if hierarchy:
            users_with_locations = flatten_hierarchy_for_map(hierarchy)
            return jsonify({
                'success': True,
                'data': users_with_locations
            })
        else:
            return jsonify({
                'success': False,
                'error': 'User not found or no access'
            }), 404
    except Exception as e:
        logger.error(f"Error getting map data: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/user-photo/<user_id>')
def get_user_photo(user_id):
    """Get user profile photo"""
    try:
        photo_data = graph_client.get_user_photo(user_id)
        if photo_data:
            return photo_data, 200, {'Content-Type': 'image/jpeg'}
        else:
            return jsonify({
                'success': False,
                'error': 'Photo not found'
            }), 404
    except Exception as e:
        logger.error(f"Error getting user photo: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'})

@app.route('/api/test-auth')
def test_auth():
    """Test authentication and permissions"""
    try:
        # Test getting access token
        token = graph_client.get_access_token()
        if not token:
            return jsonify({
                'success': False,
                'error': 'Failed to get access token',
                'details': 'Check Azure AD app configuration'
            }), 401
        
        # Test basic Graph API call
        me_data = graph_client.make_graph_request('/me')
        if me_data:
            return jsonify({
                'success': True,
                'message': 'Authentication successful',
                'user': me_data.get('displayName', 'Unknown'),
                'permissions': 'App permissions working'
            })
        else:
            # Try getting users list to test permissions
            users_data = graph_client.make_graph_request('/users', {'$top': 1})
            if users_data:
                return jsonify({
                    'success': True,
                    'message': 'App permissions working',
                    'note': '/me endpoint not available with app permissions'
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'Graph API permissions issue',
                    'details': 'Check app permissions: User.Read.All, Directory.Read.All'
                }), 403
                
    except Exception as e:
        logger.error(f"Error testing auth: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chat', methods=['POST'])
def chat_with_llm():
    """
    Endpoint for chatting with LLM about team location data
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        user_query = data.get('userQuery', '')
        team_data = data.get('teamData', [])
        provider = data.get('provider', 'openai')
        
        if not user_query:
            return jsonify({'error': 'No user query provided'}), 400
        
        # Get available providers
        available_providers = llm_service.get_available_providers()
        
        # If requested provider is not available, use the first available or fallback to simulation
        if provider not in available_providers and available_providers:
            provider = available_providers[0]
            logger.info(f"Requested provider not available, using {provider}")
        elif not available_providers:
            logger.info("No LLM providers configured, using simulated responses")
        
        # Get response from LLM service (this handles async internally)
        response_text = asyncio.run(llm_service.chat_completion(provider, user_query, team_data))
        
        return jsonify({
            'response': response_text,
            'provider': provider,
            'available_providers': available_providers,
            'timestamp': str(datetime.now())
        })
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/providers', methods=['GET'])
def get_llm_providers():
    """
    Get available LLM providers and their configuration status (Azure OpenAI only)
    """
    try:
        available_providers = llm_service.get_available_providers()
        
        provider_status = {
            'azure': {
                'available': 'azure' in available_providers,
                'configured': bool(os.getenv('AZURE_OPENAI_ENDPOINT') and 
                                 os.getenv('AZURE_OPENAI_API_KEY') and
                                 os.getenv('AZURE_OPENAI_ENDPOINT') != 'https://your-resource.openai.azure.com/' and
                                 os.getenv('AZURE_OPENAI_API_KEY') != 'your_azure_openai_api_key_here')
            }
        }
        
        return jsonify({
            'available_providers': available_providers,
            'provider_status': provider_status
        })
        
    except Exception as e:
        logger.error(f"Error getting LLM providers: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # For Azure App Service, use the PORT environment variable
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
