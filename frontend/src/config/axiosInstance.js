import axios from "axios";

const axiosInstance = axios.create({
    baseURL: process.env.REACT_APP_BACKEND_URL, // Cambia esta URL si tu backend está en otra dirección
    headers: {
        "Content-Type": "application/json",
    },
});
    
export default axiosInstance;
