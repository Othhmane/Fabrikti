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
  AlertTriangle, Info, ChevronDown
} from 'lucide-react';
import { Client } from '../../types';

const clientSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  phone: z.string().min(10, "Numéro de téléphone invalide (10 chiffres min)"),
  address: z.string().min(5, "L'adresse est trop courte"),
});

type ClientFormData = z.infer<typeof clientSchema>;

export const ClientList: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const { data: clients, isLoading } = useQuery({ queryKey: ['clients'], queryFn: FabriktiService.getClients });
  const { data: orders } = useQuery({ queryKey: ['orders'], queryFn: FabriktiService.getOrders });
  const { data: transactions } = useQuery({ queryKey: ['transactions'], queryFn: FabriktiService.getTransactions });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema)
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
    } else {
      reset();
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

  const filteredClients = clients?.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-[#F8F9FC] min-h-screen font-sans">
      {/* HEADER TITLE */}
      <div className="bg-white border-b border-slate-200 px-6 md:px-10 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500 mt-2">Gestion du portefeuille clients</p>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-6">

        {/* ACTIONS & SEARCH */}
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
            Nouveau Client
          </button>
        </div>

        {/* CLIENT GRID */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-64 bg-white border border-slate-200 animate-pulse rounded-2xl"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients?.map((client) => (
              <div key={client.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition-all shadow-sm group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center text-indigo-600 font-bold text-lg border border-indigo-200">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex gap-2 transition-opacity">
                    <button
                      onClick={() => openFormModal(client)}
                      className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all font-semibold"
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(client)}
                      className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-all font-semibold"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-3">{client.name}</h3>

                <div className="space-y-2.5 mb-4 text-sm">
                  <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg text-slate-700">
                    <Mail size={16} className="text-blue-600 shrink-0" />
                    <span className="truncate text-xs font-medium">{client.email}</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-emerald-50 rounded-lg text-slate-700">
                    <Phone size={16} className="text-emerald-600 shrink-0" />
                    <span className="text-xs font-medium">{client.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg text-slate-700">
                    <MapPin size={16} className="text-amber-600 shrink-0" />
                    <span className="truncate text-xs font-medium">{client.address}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-semibold text-slate-500">Actif</span>
                  </div>
                  <Link to={`/clients/${client.id}/history`}>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-all">
                      <History size={12} />
                      Historique
                    </button>
                  </Link>
                </div>
              </div>
            ))}

            {filteredClients?.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white border border-slate-200 rounded-2xl">
                <User size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-semibold">Aucun client trouvé</p>
                <p className="text-slate-400 text-sm mt-1">Essayez un autre terme de recherche</p>
              </div>
            )}
          </div>
        )}

        {/* MODAL FORMULAIRE */}
        {isFormModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedClient ? 'Modifier le client' : 'Nouveau client'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Informations du client</p>
                </div>
                <button onClick={closeFormModal} className="p-2 hover:bg-slate-100 rounded-lg transition-all">
                  <X size={20} className="text-slate-600" />
                </button>
              </div>

              <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Nom complet</label>
                  <input
                    placeholder="ex: OrthoPro Services"
                    {...register('name')}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Email</label>
                    <input
                      type="email"
                      placeholder="contact@pro.com"
                      {...register('email')}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Téléphone</label>
                    <input
                      placeholder="01 23 45 67 89"
                      {...register('phone')}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Adresse</label>
                  <input
                    placeholder="Rue de l'industrie, Paris"
                    {...register('address')}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  {errors.address && <p className="text-xs text-rose-500 mt-1">{errors.address.message}</p>}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeFormModal}
                    className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="flex-1 px-4 py-2.5 bg-[#6366F1] text-white rounded-xl text-sm font-semibold hover:bg-[#5558E3] transition-all disabled:opacity-50"
                  >
                    {saveMutation.isPending ? 'Enregistrement...' : (selectedClient ? 'Mettre à jour' : 'Enregistrer')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL CONFIRMATION SUPPRESSION */}
        {isDeleteModalOpen && selectedClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-center">
              <div className="mx-auto w-14 h-14 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4">
                <AlertTriangle size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Supprimer le client ?</h3>
              <p className="text-sm text-slate-600 mb-6">
                Vous êtes sur le point de supprimer <span className="font-bold">"{selectedClient.name}"</span>. Cette action est irréversible.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={() => deleteMutation.mutate(selectedClient.id)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition-all disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        )}

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
                <Link to={`/clients/${selectedClient.id}/history`} onClick={() => setIsBlockedModalOpen(false)}>
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