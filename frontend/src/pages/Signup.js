import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { getApiUrl } from "../utils/config";

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ 
    name: "", 
    email: "", 
    password: "" 
  });
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
    setFormData({ 
      ...formData, 
      [e.target.name]: e.target.value 
    });
    setError(""); // Clear error when user types
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${getApiUrl()}/api/auth/signup`, 
        formData,
        {
          headers: {
            "Content-Type": "application/json"
          },
          withCredentials: true,
          timeout: 10000
        }
      );
      
      if (response.data && response.data.token) {
        localStorage.setItem("token", response.data.token);
        navigate("/");
      } else {
        throw new Error("No token received");
      }
    } catch (err) {
      console.error("Signup error:", err);

      if (err.code === "ECONNABORTED") {
        setError("Request timed out. Please check your internet connection.");
      } else if (err.response) {
        setError(err.response.data?.message || "Signup failed. Please try again.");
      } else if (err.request) {
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
          onSubmit={handleSignup}
          className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 text-white p-8 rounded-2xl shadow-lg shadow-white/10"
        >
          <h2 className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-teal-400">
            Sign Up
          </h2>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-white px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            className="w-full p-3 rounded-lg mb-4 bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-green-400"
            required
            disabled={isLoading}
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-3 rounded-lg mb-4 bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-green-400"
            required
            disabled={isLoading}
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-3 rounded-lg mb-6 bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-green-400"
            required
            disabled={isLoading}
          />

          <button
            type="submit"
            className={`w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-bold transition ${
              isLoading ? "opacity-70 cursor-not-allowed" : ""
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                Creating Account...
              </div>
            ) : (
              "Sign Up"
            )}
          </button>

          <p className="mt-4 text-sm text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-green-400 underline">
              Login
            </Link>
          </p>
        </form>
      </div>
    </>
  );
};

export default Signup;
