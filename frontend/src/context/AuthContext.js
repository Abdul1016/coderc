import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false,
    loading: true,
    error: null
  });
  
  const navigate = useNavigate();

  // Set auth token helper
  const setAuthToken = useCallback((token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, []);

  // Load user data
  const loadUser = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));
      const response = await axios.get('/api/auth/user');
      
      setAuthState(prev => ({
        ...prev,
        user: response.data,
        isAuthenticated: true,
        loading: false,
        error: null
      }));
    } catch (err) {
      setAuthState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: err.response?.data?.msg || 'Failed to load user'
      }));
      setAuthToken(null);
    }
  }, [setAuthToken]);

  // Register user
  const register = async (formData) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      const response = await axios.post('/api/auth/register', formData);
      
      setAuthToken(response.data.token);
      await loadUser();
      navigate('/');
    } catch (err) {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.msg || 'Registration failed'
      }));
    }
  };

  // Login user
  const login = async (formData) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      const response = await axios.post('/api/auth/login', formData);
      
      setAuthToken(response.data.token);
      await loadUser();
      navigate('/');
    } catch (err) {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.msg || 'Login failed'
      }));
    }
  };

  // Logout user
  const logout = useCallback(() => {
    setAuthToken(null);
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null
    });
    navigate('/login');
  }, [navigate, setAuthToken]);

  // Clear errors
  const clearErrors = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  // Initialize auth state
  useEffect(() => {
    if (authState.token) {
      loadUser();
    } else {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, [authState.token, loadUser]);

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        register,
        login,
        logout,
        clearErrors,
        setAuthToken,
        loadUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Export the useAuth hook separately
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;