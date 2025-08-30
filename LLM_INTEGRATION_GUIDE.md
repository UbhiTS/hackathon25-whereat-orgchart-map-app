# Azure OpenAI Integration Setup Guide

This document explains how to integrate Azure OpenAI with your Teams Org Map chat interface.

## Overview

The chat interface now supports **Azure OpenAI** exclusively, providing:
- Enterprise-grade security and compliance
- Data residency controls
- Integration with your existing Azure infrastructure
- Access to GPT-4 and other OpenAI models hosted in Azure

## Setup Instructions

### Azure OpenAI Configuration

1. **Create Azure OpenAI Resource:**
   - Go to [Azure Portal](https://portal.azure.com/)
   - Create a new Azure OpenAI resource
   - Choose your preferred region and pricing tier

2. **Deploy a Model:**
   - Navigate to your Azure OpenAI resource
   - Go to "Model deployments"
   - Deploy a model (recommended: GPT-4)
   - Note your deployment name

3. **Get Credentials:**
   - In your Azure OpenAI resource, go to "Keys and Endpoint"
   - Copy the endpoint URL and API key

4. **Update Configuration:**
   Add the following to your `backend\.env` file:
   ```bash
   # Azure OpenAI Configuration
   AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
   AZURE_OPENAI_API_KEY=your-azure-openai-api-key
   AZURE_OPENAI_DEPLOYMENT=your-deployment-name
   AZURE_OPENAI_API_VERSION=2024-02-15-preview
   ```

## Current Configuration

Your current setup shows:
- **Endpoint:** `https://teamsorgmapllm.openai.azure.com/`
- **Deployment:** `gpt-4.1`
- **API Version:** `2025-04-14`

## API Endpoints

The backend provides these endpoints:

### `/api/chat` (POST)
Send chat messages to Azure OpenAI with team location context.

**Request:**
```json
{
  "userQuery": "I'm traveling to Dallas, TX. Who is nearby?",
  "teamData": [...], // The team location data from your map
  "provider": "azure"
}
```

**Response:**
```json
{
  "response": "Based on your team data, I found 2 team members in Texas...",
  "provider": "azure",
  "available_providers": ["azure"],
  "timestamp": "2025-08-29 21:00:00.000000"
}
```

### `/api/chat/providers` (GET)
Get the status of Azure OpenAI configuration.

**Response:**
```json
{
  "available_providers": ["azure"],
  "provider_status": {
    "azure": {
      "available": true,
      "configured": true
    }
  }
}
```

## Cost Considerations

Azure OpenAI pricing varies by:
- **Region** (different regions have different pricing)
- **Model** (GPT-4 is more expensive than GPT-3.5-turbo)
- **Usage** (charged per 1K tokens)

Approximate costs:
- **GPT-4**: ~$0.03 per 1K input tokens, ~$0.06 per 1K output tokens
- **GPT-3.5-turbo**: ~$0.0015 per 1K input tokens, ~$0.002 per 1K output tokens

Benefits of Azure OpenAI:
- **Enterprise compliance** (SOC 2, GDPR, etc.)
- **Data residency** (your data stays in your chosen region)
- **Integration** with Azure services
- **SLA guarantees**

## Fallback Behavior

If Azure OpenAI is not configured or unavailable, the system will:
1. Use intelligent simulated responses based on your team data
2. Still provide location-based answers for common queries
3. Display a warning message indicating simulated responses are being used

## Security Best Practices

1. **Never commit API keys to source control**
2. **Use environment variables** (`.env` file is in `.gitignore`)
3. **Monitor usage** in Azure Portal to avoid unexpected costs
4. **Use Azure Key Vault** for production deployments
5. **Set up alerts** for usage thresholds
6. **Rotate API keys regularly**

## Testing

1. Ensure your Azure OpenAI credentials are in the `.env` file
2. Restart the backend server
3. The chat interface will show "🤖 Azure OpenAI" if configured properly
4. Test with queries like:
   - "I'm traveling to Dallas, TX. Who is nearby?"
   - "How many team members are on the West Coast?"
   - "Who is in the Eastern Time Zone?"

## Troubleshooting

### "Azure OpenAI not configured"
- Check that your `.env` file has valid Azure OpenAI credentials
- Ensure the backend server was restarted after adding credentials
- Verify the endpoint URL format is correct
- Check that your deployment name matches what's in Azure

### "Error processing request"
- Check backend logs for specific error messages
- Verify your Azure OpenAI resource is active
- Ensure you have quota available in your subscription
- Check that your API key has the correct permissions

### Model deployment issues
- Ensure your model deployment is in "Succeeded" state in Azure Portal
- Verify the deployment name matches your `AZURE_OPENAI_DEPLOYMENT` setting
- Check that the API version is supported by your deployment

## Advanced Configuration

You can customize the Azure OpenAI behavior by modifying `llm_service.py`:
- Adjust `temperature` for more/less creative responses (0.0-1.0)
- Modify `max_tokens` for longer/shorter responses
- Update the system prompt for different conversation styles
- Switch between different deployed models

## Monitoring and Optimization

1. **Monitor usage** in Azure Portal under your OpenAI resource
2. **Set up cost alerts** to avoid unexpected charges
3. **Optimize prompts** to reduce token usage
4. **Cache frequent responses** if needed
5. **Use appropriate models** (GPT-3.5 for simpler tasks, GPT-4 for complex reasoning)

The system is designed to provide intelligent, context-aware responses about your team's geographic distribution while maintaining enterprise-grade security through Azure OpenAI.
