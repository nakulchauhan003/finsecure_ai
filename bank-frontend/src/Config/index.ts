import axios from "axios";

// Use VITE_API_URL when provided, otherwise use relative requests so the app doesn't try to contact localhost
export const BASE_URL = import.meta.env.VITE_API_URL || "";

export const clientServer = axios.create({
  baseURL: BASE_URL,
  // Optional: set a short timeout so failing requests surface quickly
  timeout: 5000,
})
