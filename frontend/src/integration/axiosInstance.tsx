/** @format */

import axios from "axios";

// Create axios instance
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // use the same env variable as Login.tsx
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // read JWT stored by Google login
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // On error, clear JWT
    localStorage.removeItem("token");
    return Promise.reject(error);
  }
);

export default axiosInstance;
