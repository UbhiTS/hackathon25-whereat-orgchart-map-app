import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_azure_ad_config():
    """Test Azure AD configuration"""
    print("🔍 Testing Azure AD Configuration...")
    
    # Check environment variables
    client_id = os.getenv('AZURE_CLIENT_ID')
    client_secret = os.getenv('AZURE_CLIENT_SECRET')
    tenant_id = os.getenv('AZURE_TENANT_ID')
    
    if not client_id:
        print("❌ AZURE_CLIENT_ID not found in environment")
        return False
    if not client_secret:
        print("❌ AZURE_CLIENT_SECRET not found in environment")
        return False
    if not tenant_id:
        print("❌ AZURE_TENANT_ID not found in environment")
        return False
    
    print(f"✅ Client ID: {client_id[:8]}...")
    print(f"✅ Tenant ID: {tenant_id}")
    print("✅ Client Secret: [PRESENT]")
    
    # Test token acquisition
    print("\n🔐 Testing token acquisition...")
    url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    data = {
        'client_id': client_id,
        'client_secret': client_secret,
        'scope': 'https://graph.microsoft.com/.default',
        'grant_type': 'client_credentials'
    }
    
    try:
        response = requests.post(url, headers=headers, data=data)
        if response.status_code == 200:
            token_data = response.json()
            print("✅ Token acquired successfully")
            
            # Test Graph API call
            print("\n📊 Testing Graph API access...")
            graph_headers = {
                'Authorization': f'Bearer {token_data["access_token"]}',
                'Content-Type': 'application/json'
            }
            
            # Test basic users endpoint
            graph_response = requests.get(
                'https://graph.microsoft.com/v1.0/users?$top=1',
                headers=graph_headers
            )
            
            if graph_response.status_code == 200:
                print("✅ Graph API access successful")
                return True
            elif graph_response.status_code == 403:
                print("❌ Graph API access forbidden")
                print("💡 Solution: Check app permissions and admin consent")
                print("   Required permissions (Application type):")
                print("   - User.Read.All")
                print("   - Directory.Read.All")
                print("   - Organization.Read.All")
                print("   - People.Read.All")
                return False
            else:
                print(f"❌ Graph API error: {graph_response.status_code}")
                print(f"   Response: {graph_response.text}")
                return False
                
        else:
            print(f"❌ Token acquisition failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_specific_user(email):
    """Test access to specific user"""
    print(f"\n👤 Testing access to user: {email}")
    
    # Get token first
    client_id = os.getenv('AZURE_CLIENT_ID')
    client_secret = os.getenv('AZURE_CLIENT_SECRET')
    tenant_id = os.getenv('AZURE_TENANT_ID')
    
    url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    data = {
        'client_id': client_id,
        'client_secret': client_secret,
        'scope': 'https://graph.microsoft.com/.default',
        'grant_type': 'client_credentials'
    }
    
    try:
        token_response = requests.post(url, data=data)
        token_data = token_response.json()
        
        headers = {
            'Authorization': f'Bearer {token_data["access_token"]}',
            'Content-Type': 'application/json'
        }
        
        # Test user endpoint
        user_url = f'https://graph.microsoft.com/v1.0/users/{email}'
        params = {
            '$select': 'id,displayName,mail,userPrincipalName,jobTitle,department'
        }
        
        user_response = requests.get(user_url, headers=headers, params=params)
        
        if user_response.status_code == 200:
            user_data = user_response.json()
            print(f"✅ User found: {user_data.get('displayName')}")
            print(f"   Job Title: {user_data.get('jobTitle', 'N/A')}")
            print(f"   Department: {user_data.get('department', 'N/A')}")
            return True
        elif user_response.status_code == 404:
            print("❌ User not found")
            print("💡 Check if the email address is correct and user exists in your tenant")
            return False
        elif user_response.status_code == 403:
            print("❌ Access forbidden to user data")
            print("💡 Check app permissions and admin consent")
            return False
        else:
            print(f"❌ Error: {user_response.status_code}")
            print(f"   Response: {user_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Azure AD Diagnostic Tool")
    print("=" * 40)
    
    # Test basic configuration
    config_ok = test_azure_ad_config()
    
    if config_ok:
        print("\n" + "=" * 40)
        test_email = input("Enter a user email to test (or press Enter to skip): ").strip()
        if test_email:
            test_specific_user(test_email)
    
    print("\n" + "=" * 40)
    print("🏁 Diagnostic complete!")
    
    if not config_ok:
        print("\n💡 Next steps:")
        print("1. Check your .env file has correct Azure AD credentials")
        print("2. Verify app permissions in Azure Portal")
        print("3. Ensure admin consent has been granted")
        print("4. Run this diagnostic again")
