
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/**
 * COMPOSANT DE SÉCURITÉ : AUTHGUARD
 * --------------------------------
 * Ce composant "entoure" les pages privées.
 * 
 * RÔLE :
 * 1. Vérifie si l'utilisateur possède un token dans le store.
 * 2. Si NON : Redirige vers /login en mémorisant la page d'origine (state).
 * 3. Si OUI : Affiche la page demandée (children).
 * 
 * ÉVOLUTION NESTJS :
 * Ce garde est purement "Front". Le backend NestJS vérifiera 
 * également la validité du JWT à chaque appel API via le client Axios.
 */
export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirige vers login tout en gardant en mémoire l'URL visée pour y revenir après succès
    console.log(`[AUTH_GUARD] Accès refusé à ${location.pathname}. Redirection /login.`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
