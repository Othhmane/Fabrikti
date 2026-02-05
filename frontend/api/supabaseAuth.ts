import { supabase } from './supabase';
import { User } from '../types';

/**
 * SERVICE D'AUTHENTIFICATION SUPABASE
 * -----------------------------------
 * Gère l'authentification via Supabase Auth
 */

export const SupabaseAuthService = {
  /**
   * Inscription d'un nouvel utilisateur
   */
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Connexion utilisateur
   */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw new Error(error.message);
    
    return {
      user: {
        id: data.user?.id || '',
        email: data.user?.email || '',
        name: data.user?.user_metadata?.name || '',
      } as User,
      token: data.session?.access_token || '',
    };
  },

  /**
   * Déconnexion utilisateur
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  /**
   * Récupère la session actuelle
   */
  async getCurrentSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    return data.session;
  },

  /**
   * Récupère l'utilisateur actuel
   */
  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(error.message);
    return data.user;
  },

  /**
   * Écoute les changements d'authentification
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return subscription;
  },
};
