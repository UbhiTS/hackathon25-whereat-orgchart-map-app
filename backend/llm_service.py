"""
LLM Service Integration Module
Handles communication with Azure OpenAI only
"""

import os
import base64
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
import logging
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class LLMService:
    """Service class for integrating with Azure OpenAI only"""
    
    def __init__(self):
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Azure OpenAI client"""
        
        # Azure OpenAI Client
        self.endpoint = os.getenv('AZURE_OPENAI_ENDPOINT')
        self.deployment = os.getenv('AZURE_OPENAI_DEPLOYMENT')
        self.key = os.getenv('AZURE_OPENAI_API_KEY')
        self.version = os.getenv('AZURE_OPENAI_API_VERSION')
        
        self.client = OpenAI(
                    base_url=self.endpoint,
                    api_key=self.key
                )

    def get_available_providers(self) -> List[str]:
        """Get list of available LLM providers (Azure OpenAI only)"""
        providers = []
        if self.client:
            providers.append('azure')
        return providers

    async def chat_completion(self, provider: str, user_query: str, team_data: List[Dict[str, Any]]) -> str:
        system_prompt = self._create_system_prompt(team_data)
        return await self._azure_openai_completion(user_query, system_prompt)

    def _create_system_prompt(self, team_data: List[Dict[str, Any]]) -> str:
        """Create system prompt with team context"""
        team_count = len(team_data)
        
        # Extract key team information
        locations = []
        location_types = {'address': 0, 'phone': 0, 'timezone': 0}
        
        for member in team_data:
            user_info = member.get('user', {})
            location_info = member.get('location', {})
            location_type = member.get('location_type', 'unknown')
            
            if location_type in location_types:
                location_types[location_type] += 1
            
            if location_info.get('address'):
                locations.append({
                    'name': user_info.get('displayName', 'Unknown'),
                    'title': user_info.get('jobTitle', ''),
                    'department': user_info.get('department', ''),
                    'address': location_info.get('address', ''),
                    'accuracy': location_type
                })

        system_prompt = f"""You are a helpful assistant that specializes in analyzing team location data and helping with travel planning and team coordination.

You have access to data for {team_count} team members with the following location accuracy:
- {location_types['address']} members with precise addresses/offices
- {location_types['phone']} members with phone-based location approximations  
- {location_types['timezone']} members with timezone-only locations

Team member details:
{json.dumps(locations, indent=2)}

Your role is to:
1. Help users find team members near specific locations for in-person meetings
2. Provide insights about team geographic distribution
3. Assist with travel planning by identifying nearby colleagues
4. Answer questions about team locations, time zones, and regional presence

Security and Privacy:
MAKE SURE TO NEVER GIVE OUT THE STREET ADDRESS OF ANY TEAM MEMBER, only give out City and State in any response you give. This is VERY IMPORTANT for privacy reasons.

Always be helpful, accurate, and provide specific names and locations when relevant. If asked about travel to a specific city, identify team members in that area or nearby regions."""

        return system_prompt

    async def _azure_openai_completion(self, user_query: str, system_prompt: str) -> str:
        completion = self.client.chat.completions.create(
            model=self.deployment,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query}
            ]
        )
        
        return completion.choices[0].message.content
                

# Global instance
llm_service = LLMService()
