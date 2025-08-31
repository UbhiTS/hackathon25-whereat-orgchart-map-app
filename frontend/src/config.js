// Runtime configuration utility
// This allows accessing environment variables that are injected at runtime by the Express server

const config = {
  // Fallback to build-time environment variables if runtime config is not available
  AZURE_MAPS_API_KEY: (typeof window !== 'undefined' && window.ENV?.REACT_APP_AZURE_MAPS_API_KEY) || process.env.REACT_APP_AZURE_MAPS_API_KEY,
  BACKEND_URL: (typeof window !== 'undefined' && window.ENV?.REACT_APP_BACKEND_URL) || process.env.REACT_APP_BACKEND_URL,
  DEBUG: (typeof window !== 'undefined' && window.ENV?.REACT_APP_DEBUG) || process.env.REACT_APP_DEBUG,
};

// Helper function to get configuration values
export const getConfig = () => {
  return {
    azureMapsApiKey: config.AZURE_MAPS_API_KEY,
    backendUrl: config.BACKEND_URL,
    debug: config.DEBUG === 'true' || config.DEBUG === 'True' || config.DEBUG === true,
  };
};

// Helper function to check if configuration is loaded
export const isConfigLoaded = () => {
  return !!(config.AZURE_MAPS_API_KEY && config.BACKEND_URL);
};

// Export individual config values for convenience
export const AZURE_MAPS_API_KEY = config.AZURE_MAPS_API_KEY;
export const BACKEND_URL = config.BACKEND_URL;
export const DEBUG = config.DEBUG === 'true' || config.DEBUG === 'True' || config.DEBUG === true;

export default config;
