/**
 * Configuration utility for handling API URLs across environments
 */

/**
 * Returns the appropriate API URL based on the current environment
 * @returns {string} API base URL
 */
export const getApiUrl = () => {
    // Check if we're in production by looking at the window location
    const isProduction = 
      window.location.hostname !== 'localhost' && 
      !window.location.hostname.includes('127.0.0.1');
    
    // Get API URL from environment variables if available
    const envApiUrl = process.env.REACT_APP_API_URL;
    
    if (envApiUrl) {
      return envApiUrl;
    }
    
    // Default URLs based on environment
    if (isProduction) {
      // Replace this with your production API URL
      return 'https://your-production-api.com';
    }
    
    // Local development
    return 'http://localhost:5000';
  };
  
  /**
   * Returns the appropriate WebSocket URL based on current environment
   * @returns {string} WebSocket base URL
   */
  export const getWsUrl = () => {
    // Check if we're in production
    const isProduction = 
      window.location.hostname !== 'localhost' && 
      !window.location.hostname.includes('127.0.0.1');
    
    // Get WebSocket URL from environment variables if available
    const envWsUrl = process.env.REACT_APP_WS_URL;
    
    if (envWsUrl) {
      return envWsUrl;
    }
    
    // Default URLs based on environment
    if (isProduction) {
      // Replace with your production WebSocket URL
      return 'wss://your-production-api.com';
    }
    
    // Local development
    return 'ws://localhost:5000';
  };
  
  /**
   * Create authentication headers for API requests
   * @returns {Object} Headers object with Authorization if token exists
   */
  export const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    
    if (token) {
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
    }
    
    return {
      'Content-Type': 'application/json'
    };
  };