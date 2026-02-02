import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FabriktiService } from '../../api/services';
import { Card, Button, Input } from '../../components/UI';
import {
  Search, Plus, Mail, Phone, MapPin,
  Edit, Trash2, History, X, User,
  AlertTriangle, Info, ChevronDown, Truck, Users
} from 'lucide-react';
import { Client } from '../../types';

const clientSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  phone: z.string().min(10, "Numéro de téléphone invalide (10 chiffres min)"),
  type: z.enum(['CLIENT', 'FOURNISSEUR']), // Nouveau champ
});

type ClientFormData = z.infer<typeof clientSchema>;

export const SupplierHistory: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'CLIENT' | 'FOURNISSEUR'>('ALL');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const { data: clients, isLoading } = useQuery({ queryKey: ['clients'], queryFn: FabriktiService.getClients });
  const { data: orders } = useQuery({ queryKey: ['orders'], queryFn: FabriktiService.getOrders });
  const { data: transactions } = useQuery({ queryKey: ['transactions'], queryFn: FabriktiService.getTransactions });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: { type: 'CLIENT' }
  });

  const saveMutation = useMutation({
    mutationFn: (data: ClientFormData) => FabriktiService.saveClient({
      ...data,
      id: selectedClient?.id,
      providedProducts: selectedClient?.providedProducts || []
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      closeFormModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => FabriktiService.deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsDeleteModalOpen(false);
      setSelectedClient(null);
    }
  });

  const openFormModal = (client: Client | null = null) => {
    setSelectedClient(client);
    if (client) {
      setValue('name', client.name);
      setValue('email', client.email);
      setValue('phone', client.phone);
      setValue('address', client.address);
      setValue('type', (client as any).type || 'CLIENT');
    } else {
      reset({ type: 'CLIENT' });
    }
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedClient(null);
    reset();
  };

  const handleDeleteClick = (client: Client) => {
    setSelectedClient(client);
    const hasOrders = orders?.some(o => o.clientId === client.id);
    const hasTransactions = transactions?.some(t => t.clientId === client.id);

    if (hasOrders || hasTransactions) {
      setIsBlockedModalOpen(true);
    } else {
      setIsDeleteModalOpen(true);
    }
  };

  const filteredClients = clients?.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || (c as any).type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="bg-[#F8F9FC] min-h-screen font-sans">
      <div className="bg-white border-b border-slate-200 px-6 md:px-10 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Partenaires</h1>
            <p className="text-sm text-slate-500 mt-2">Gestion des clients et fournisseurs</p>
          </div>
{/* Barre de filtres responsive */}
<div className="flex flex-wrap gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full">
  <button 
    onClick={() => setFilterType('ALL')}
    className={`flex-1 min-w-[80px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
      filterType === 'ALL' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'
    }`}
  >
    Tout
  </button>
  <button 
    onClick={() => setFilterType('CLIENT')}
    className={`flex-1 min-w-[80px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
      filterType === 'CLIENT' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'
    }`}
  >
    Clients
  </button>
  <button 
    onClick={() => setFilterType('FOURNISSEUR')}
    className={`flex-1 min-w-[80px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
      filterType === 'FOURNISSEUR' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'
    }`}
  >
    Fournisseurs
  </button>
</div>
        </div>
      </div>

      <div className="p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => openFormModal()}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#6366F1] text-white rounded-lg text-sm font-semibold hover:bg-[#5558E3] transition-all shadow-md hover:shadow-lg whitespace-nowrap"
            >
              <Plus size={18} />
              Nouveau Partenaire
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="h-64 bg-white border border-slate-200 animate-pulse rounded-2xl"></div>)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients?.map((client) => (
                <div key={client.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition-all shadow-sm group relative overflow-hidden">
                  {/* Badge Type */}
                  <div className={`absolute top-0  right-0 px-3 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-wider ${
                    (client as any).type === 'FOURNISSEUR' ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {(client as any).type === 'FOURNISSEUR' ? 'Fournisseur' : 'Client'}
                  </div>

                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border ${
                      (client as any).type === 'FOURNISSEUR' 
                      ? 'bg-amber-50 text-amber-600 border-amber-200' 
                      : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                    }`}>
                      {(client as any).type === 'FOURNISSEUR' ? <Truck size={20}/> : client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openFormModal(client)} className="p-2 text-yellow-600 bg-yellow-50 hover:bg-yellow-100 rounded-lg border border-yellow-200 transition-all font-semibold"><Edit size={16} /></button>
                      <button onClick={() => handleDeleteClick(client)} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-all font-semibold"><Trash2 size={16} /></button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-3">{client.name}</h3>
                  <div className="space-y-2.5 mb-4 text-sm">
                    {/*
                    <div className="bg-blue-50 flex items-center gap-3 p-2 bg-slate-50 rounded-lg text-slate-700 border border-slate-100">
                      <Mail size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate text-xs font-medium">{client.email}</span>
                    </div>
                    */}
                    <div className="bg-green-50 flex items-center gap-3 p-2 bg-slate-50 rounded-lg text-slate-700 border border-slate-100">
                      <Phone size={14} className="text-slate-400 shrink-0" />
                      <span className="text-xs font-medium">{client.phone}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-xs font-semibold text-slate-500">Actif</span>
                    </div>
<Link to={`/${(client as any).type === 'FOURNISSEUR' ? 'suppliers' : 'clients'}/${client.id}/history`}>
  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-all">
    <History size={12} />
    Historique
  </button>
</Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MODAL FORMULAIRE */}
          {isFormModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedClient ? 'Modifier' : 'Nouveau partenaire'}</h3>
                    <p className="text-sm text-slate-500 mt-1">Informations générales</p>
                  </div>
                  <button onClick={closeFormModal} className="p-2 hover:bg-slate-100 rounded-lg transition-all"><X size={20} className="text-slate-600" /></button>
                </div>

                <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
                  {/* SELECTEUR DE TYPE */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Type de partenaire</label>
                    <select 
                      {...register('type')}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="CLIENT">Client (Acheteur)</option>
                      <option value="FOURNISSEUR">Fournisseur (Vendeur de matières)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Nom complet / Raison sociale</label>
                    <input placeholder="ex: OrthoPro Services" {...register('name')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Email</label>
                      <input type="email" placeholder="contact@pro.com" {...register('email')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
                      {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Téléphone</label>
                      <input placeholder="01 23 45 67 89" {...register('phone')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
                      {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Adresse</label>
                    <input placeholder="Rue de l'industrie, Paris" {...register('address')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    {errors.address && <p className="text-xs text-rose-500 mt-1">{errors.address.message}</p>}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={closeFormModal} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all">Annuler</button>
                    <button type="submit" disabled={saveMutation.isPending} className="flex-1 px-4 py-2.5 bg-[#6366F1] text-white rounded-xl text-sm font-semibold hover:bg-[#5558E3] transition-all disabled:opacity-50">
                      {saveMutation.isPending ? 'Enregistrement...' : (selectedClient ? 'Mettre à jour' : 'Enregistrer')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* ... Reste des modals (Delete, Blocked) inchangés ... */}
   {/* MODAL BLOCAGE SUPPRESSION */}
        {isBlockedModalOpen && selectedClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-center">
              <div className="mx-auto w-14 h-14 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
                <Info size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Action impossible</h3>
              <p className="text-sm text-slate-600 mb-6">
                Le client <span className="font-bold">"{selectedClient.name}"</span> possède des commandes ou transactions actives. Il ne peut pas être supprimé.
              </p>
              <div className="space-y-2">
                <Link to={`/${(client as any).type === 'FOURNISSEUR' ? 'suppliers' : 'clients'}/${selectedClient.id}/history`} onClick={() => setIsBlockedModalOpen(false)}>
                  <button className="w-full px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all">
                    Consulter l'historique
                  </button>
                </Link>
                <button
                  onClick={() => setIsBlockedModalOpen(false)}
                  className="w-full px-4 py-2.5 text-slate-500 text-sm font-semibold hover:text-slate-700 transition-all"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
        </div>
      </div>
  );
};