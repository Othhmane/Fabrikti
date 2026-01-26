
import { create } from 'zustand';
import { User } from '../types';

/**
 * STORE D'AUTHENTIFICATION (ZUSTAND)
 * ----------------------------------
 * Gère l'état de connexion de l'utilisateur à travers toute l'application.
 * 
 * PERSISTANCE :
 * Le store lit le 'user' et le 'token' dans le LocalStorage au démarrage
 * pour éviter de se déconnecter au rafraîchissement de la page (F5).
 */

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Récupération initiale (Hydratation)
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  
  /** Action de connexion : Met à jour le store et le cache navigateur */
  login: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    console.log(`[AUTH_STORE] Login réussi pour ${user.email}`);
    set({ user, token, isAuthenticated: true });
  },
  
  /** Action de déconnexion : Vide tout pour la sécurité */
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    console.log(`[AUTH_STORE] Déconnexion effectuée.`);
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
