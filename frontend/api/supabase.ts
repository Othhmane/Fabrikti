import { createClient } from '@supabase/supabase-js';

/**
 * CLIENT SUPABASE
 * ---------------
 * Initialisation du client Supabase pour l'authentification et la base de données.
 * Les URL et clés doivent être configurées dans le fichier .env
 */

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ Les variables SUPABASE_URL et SUPABASE_ANON_KEY ne sont pas configurées dans .env');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
  },
});
