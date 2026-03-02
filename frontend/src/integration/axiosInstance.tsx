/** @format */

import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Utility function for clearing auth when needed
export const clearAuth = () => {
  localStorage.removeItem("userToken");
  localStorage.removeItem("user");
  window.location.href = "/";
};

// Attach JWT automatically
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("userToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Handle errors gracefully - only clear tokens on explicit logout or critical auth failures
axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    // Check if this is a token validation failure (likely expired or tampered with)
    // Only then should we clear tokens and redirect
    if (error.response?.status === 401) {
      const errorMsg = error.response?.data?.error || "";

      // Only auto-logout if token is truly invalid (not just missing from optional endpoint)
      // Don't auto-logout on 401 - let the calling component handle it
      // Components can decide if the error is critical or if they should handle it gracefully
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
