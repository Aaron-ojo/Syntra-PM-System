import axios from "axios";
import type {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosError,
} from "axios";
import { API_URL } from "../config";

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - adds auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    console.log("Token from localStorage:", token ? "Exists" : "NOT FOUND");

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("Added Authorization header");
    } else {
      console.log("No token to add");
    }

    return config;
  },
  (error: AxiosError) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log("Response received:", response.config.url, response.status);
    return response;
  },
  (error: AxiosError) => {
    console.error(
      "Response error:",
      error.response?.status,
      error.response?.data,
    );
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);
