import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { getApiUrl } from "../utils/config";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/");
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(""); // Clear error when user types
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    // Basic validation
    if (!formData.email.trim() || !formData.password.trim()) {
      setError("Email and password are required");
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await axios.post(
        `${getApiUrl()}/api/auth/login`, 
        formData,
        {
          headers: { 
            "Content-Type": "application/json" 
          },
          withCredentials: true, // Important for CORS with credentials
          timeout: 10000 // 10 seconds timeout
        }
      );
      
      if (response.data && response.data.token) {
        // Save user info if needed
        if (response.data.user) {
          localStorage.setItem("user", JSON.stringify(response.data.user));
        }
        
        // Save token and redirect
        localStorage.setItem("token", response.data.token);
        navigate("/");
      } else {
        setError("Authentication failed. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      
      // Handle different error scenarios
      if (err.code === "ECONNABORTED") {
        setError("Request timed out. Please check your internet connection.");
      } else if (err.response) {
        // Server responded with an error status
        if (err.response.status === 401) {
          setError("Invalid credentials. Please check your email and password.");
        } else {
          setError(err.response.data?.message || "Login failed. Please try again.");
        }
      } else if (err.request) {
        // Request made but no response received
        setError("Server is unreachable. Please try again later.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="animated-grainy-bg" />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 text-white p-8 rounded-2xl shadow-lg shadow-white/10"
        >
          <h2 className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-yellow-400">
            Login
          </h2>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-white px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-3 rounded-lg mb-4 bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
            disabled={isLoading}
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-3 rounded-lg mb-6 bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
            disabled={isLoading}
          />

          <button
            type="submit"
            className={`w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-bold transition ${
              isLoading ? "opacity-70 cursor-not-allowed" : ""
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                Logging in...
              </div>
            ) : (
              "Login"
            )}
          </button>

          <p className="mt-4 text-sm text-center">
            Don't have an account?{" "}
            <Link to="/signup" className="text-blue-400 underline">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </>
  );
};

export default Login;