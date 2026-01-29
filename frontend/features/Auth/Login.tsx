
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FabriktiService } from '../../api/services';
import { useAuthStore } from '../../store/authStore';
import { Button, Input, Card } from '../../components/UI';
import { LogIn, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const loginSchema = z.object({
  identifier: z.string().min(1, "Identifiant requis"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const Login: React.FC = () => {
  const login = useAuthStore(s => s.login);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    setError('');
    
    // Identifiants de test : tchouna@tchouna / tchouna
    const isTestUser = data.identifier === 'tchouna@tchouna' && data.password === 'tchouna';

    try {
      if (isTestUser || (data.identifier === 'admin@fabrikti.com' && data.password === 'admin')) {
        const response = await FabriktiService.login(data.identifier, data.password);
        login(response.user, response.token);
        navigate('/');
      } else {
        setError('Identifiants invalides. Utilisez tchouna@tchouna / tchouna.');
      }
    } catch (err) {
      setError('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md p-8 border-none shadow-2xl shadow-blue-100">
        <div className="text-center mb-8">
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-lg shadow-blue-200 ring-4 ring-white">
                <img src="/features/images/tchouna.png" alt="User Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="absolute bg-indigo-600 -bottom-2 -right-2 w-8 h-8 bg-white rounded-full border-2 border-slate-50 flex items-center justify-center text-slate-300 shadow-sm overflow-hidden">
                F
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Fabrikti</h1>
          <p className="text-slate-500 mt-2 font-medium italic text-sm">Production & Gestion Industrielle</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg font-medium flex gap-2 items-center">
            <span className="flex-1">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input 
            label="Identifiant Professionnel" 
            placeholder="tchouna@tchouna" 
            {...register('identifier')} 
            error={errors.identifier?.message as string} 
          />
          <Input 
            label="Mot de passe" 
            type="password" 
            placeholder="••••••••" 
            {...register('password')} 
            error={errors.password?.message as string} 
          />
          
          <div className="pt-2">
            <Button type="submit" className="w-full h-12 text-lg shadow-xl shadow-blue-200" isLoading={loading}>
              <LogIn size={20} className="mr-1" />
              Connexion
            </Button>
          </div>
        </form>
        
        <div className="mt-8 text-center text-[11px] text-slate-400 font-bold uppercase tracking-widest">
          Accès Restreint • Fabrikti ERP v2.6
        </div>
      </Card>
    </div>
  );
};
