import axios from 'axios';

const API = axios.create({ 
    baseURL: process.env.REACT_APP_API_URL || '/api'
});

// Attach JWT token to all requests
API.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers['x-auth-token'] = token;
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

export default API;
