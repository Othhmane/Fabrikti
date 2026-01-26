
import axios from 'axios';

/**
 * CONFIGURATION DU CLIENT API (AXIOS)
 * ----------------------------------
 * C'est ici que l'on configure la communication avec le backend NestJS.
 * 
 * 1. BaseURL : Utilise une variable d'environnement (VITE_API_URL).
 * 2. Interceptor Request : Injecte automatiquement le Token JWT s'il existe.
 * 3. Interceptor Response (À AJOUTER) : Pourrait gérer les erreurs 401 (token expiré).
 */

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token de sécurité à chaque requête sortante
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    // Standard NestJS / PassportJWT : Le token doit être préfixé par 'Bearer '
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// TODO: Ajouter un intercepteur de réponse pour rediriger vers /login en cas d'erreur 401
