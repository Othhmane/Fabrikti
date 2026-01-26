
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FabriktiService } from '../../api/services';
import { Card, Button, Input, Badge } from '../../components/UI';
import { 
  Search, Plus, Mail, Phone, MapPin, 
  Edit, Trash2, History, X, User, 
  AlertTriangle, CheckCircle2, Info
} from 'lucide-react';
import { Client } from '../../types';

// Schéma de validation Zod pour le formulaire client
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
  
  // États pour les modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);
  
  // Client sélectionné pour édition ou suppression
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Récupération des données (Clients + Dépendances pour vérif suppression)
  const { data: clients, isLoading } = useQuery({ queryKey: ['clients'], queryFn: FabriktiService.getClients });
  const { data: orders } = useQuery({ queryKey: ['orders'], queryFn: FabriktiService.getOrders });
  const { data: transactions } = useQuery({ queryKey: ['transactions'], queryFn: FabriktiService.getTransactions });

  // Formulaire avec React Hook Form
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema)
  });

  // Mutation pour Sauvegarde (Ajout ou Modification)
  const saveMutation = useMutation({
    mutationFn: (data: ClientFormData) => FabriktiService.saveClient({
      ...data,
      id: selectedClient?.id, // Si présent, c'est une édition
      providedProducts: selectedClient?.providedProducts || []
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      closeFormModal();
    }
  });

  // Mutation pour Suppression
  const deleteMutation = useMutation({
    mutationFn: (id: string) => FabriktiService.deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsDeleteModalOpen(false);
      setSelectedClient(null);
    }
  });

  // Gestion de l'ouverture du modal de formulaire
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

  // Logique de vérification de suppression
  const handleDeleteClick = (client: Client) => {
    setSelectedClient(client);
    
    // Vérification des dépendances métier
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
    <div className="space-y-6">
      {/* HEADER ACTIONS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Gestion Clients</h2>
          <p className="text-slate-500 font-medium italic text-sm">Portefeuille partenaires et comptes clients.</p>
        </div>
        <Button onClick={() => openFormModal()} className="h-12 px-6 shadow-xl shadow-blue-500/20">
          <Plus size={18} /> Nouveau Client
        </Button>
      </div>

      {/* SEARCH BAR */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
        <Input 
          placeholder="Rechercher un partenaire par nom ou email..." 
          className="pl-12 h-14 rounded-2xl border-slate-200 focus:ring-blue-100 font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* CLIENT GRID */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-[32px]"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredClients?.map((client) => (
            <Card key={client.id} className="p-8 flex flex-col group overflow-hidden border-slate-200 rounded-[32px] hover:border-blue-200 transition-all shadow-lg shadow-slate-200/20">
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-2xl border border-blue-100 shadow-inner">
                  {client.name.charAt(0)}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                  <button 
                    onClick={() => openFormModal(client)}
                    className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all"
                    title="Modifier"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(client)}
                    className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-red-600 hover:border-red-200 shadow-sm transition-all"
                    title="Supprimer"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <h3 className="text-xl font-black text-slate-900 mb-1 uppercase tracking-tighter">{client.name}</h3>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                  <div className="p-1.5 bg-slate-50 rounded-lg"><Mail size={14} className="text-slate-400"/></div>
                  <span>{client.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                  <div className="p-1.5 bg-slate-50 rounded-lg"><Phone size={14} className="text-slate-400"/></div>
                  <span>{client.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                  <div className="p-1.5 bg-slate-50 rounded-lg"><MapPin size={14} className="text-slate-400"/></div>
                  <span className="truncate">{client.address}</span>
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actif</span>
                </div>
                <Link to={`/clients/${client.id}/history`}>
                  <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-slate-200">
                    <History size={14} /> Fiche Client
                  </button>
                </Link>
              </div>
            </Card>
          ))}
          {filteredClients?.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-200">
               <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                  <User size={32} />
               </div>
               <p className="text-slate-500 font-bold uppercase tracking-tight">Aucun partenaire trouvé</p>
               <p className="text-slate-400 text-sm italic mt-1">Essayez un autre terme de recherche.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL FORMULAIRE (AJOUT / ÉDITION) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <Card className="w-full max-w-lg p-8 rounded-[32px] shadow-2xl animate-in zoom-in-95 duration-300 border-none relative">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                    {selectedClient ? <Edit size={24} /> : <User size={24} />}
                 </div>
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">
                      {selectedClient ? 'Éditer Partenaire' : 'Nouveau Partenaire'}
                    </h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Informations Commerciales</p>
                 </div>
              </div>
              <button onClick={closeFormModal} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"><X size={24}/></button>
            </div>

            <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
              <Input 
                label="Raison Sociale / Nom complet" 
                placeholder="ex: OrthoPro Services" 
                {...register('name')} 
                error={errors.name?.message}
                className="rounded-2xl h-14" 
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <Input 
                  label="Email de contact" 
                  type="email" 
                  placeholder="contact@pro.com" 
                  {...register('email')} 
                  error={errors.email?.message}
                  className="rounded-2xl h-14" 
                 />
                 <Input 
                  label="Téléphone direct" 
                  placeholder="01 23 45 67 89" 
                  {...register('phone')} 
                  error={errors.phone?.message}
                  className="rounded-2xl h-14" 
                 />
              </div>
              <Input 
                label="Adresse du Siège" 
                placeholder="Rue de l'industrie, Paris" 
                {...register('address')} 
                error={errors.address?.message}
                className="rounded-2xl h-14" 
              />
              
              <div className="flex gap-4 pt-4">
                <Button type="button" variant="secondary" className="flex-1 h-14 rounded-2xl font-black uppercase text-sm" onClick={closeFormModal}>Annuler</Button>
                <Button type="submit" className="flex-1 h-14 rounded-2xl font-black uppercase text-sm shadow-xl shadow-blue-500/20" isLoading={saveMutation.isPending}>
                  {selectedClient ? 'Mettre à jour' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL CONFIRMATION SUPPRESSION */}
      {isDeleteModalOpen && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <Card className="w-full max-w-md p-8 rounded-[32px] shadow-2xl animate-in zoom-in-95 duration-200 border-none text-center">
             <div className="mx-auto w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                <AlertTriangle size={32} />
             </div>
             <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Supprimer le client ?</h3>
             <p className="text-slate-500 mb-8">
               Vous êtes sur le point de supprimer définitivement <span className="font-black text-slate-900">"{selectedClient.name}"</span>. 
               Cette action est irréversible.
             </p>
             <div className="flex gap-4">
                <Button variant="secondary" className="flex-1 h-12 rounded-xl font-black uppercase text-xs" onClick={() => setIsDeleteModalOpen(false)}>Annuler</Button>
                <Button variant="danger" className="flex-1 h-12 rounded-xl font-black uppercase text-xs shadow-lg shadow-red-200" onClick={() => deleteMutation.mutate(selectedClient.id)} isLoading={deleteMutation.isPending}>
                  Supprimer
                </Button>
             </div>
          </Card>
        </div>
      )}

      {/* MODAL BLOCAGE SUPPRESSION (CONTRAINTES MÉTIER) */}
      {isBlockedModalOpen && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <Card className="w-full max-w-md p-8 rounded-[32px] shadow-2xl animate-in zoom-in-95 duration-200 border-none text-center">
             <div className="mx-auto w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                <Info size={32} />
             </div>
             <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Action impossible</h3>
             <p className="text-slate-500 mb-8">
               Le client <span className="font-black text-slate-900">"{selectedClient.name}"</span> possède des commandes ou transactions actives. 
               Pour préserver l'intégrité des données, il ne peut pas être supprimé.
             </p>
             <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solutions alternatives</p>
                <Link to={`/clients/${selectedClient.id}/history`} onClick={() => setIsBlockedModalOpen(false)} className="block">
                  <Button variant="secondary" className="w-full h-12 rounded-xl font-black uppercase text-xs">
                    Consulter l'historique
                  </Button>
                </Link>
                <Button variant="ghost" className="w-full h-12 rounded-xl font-black uppercase text-xs text-slate-400" onClick={() => setIsBlockedModalOpen(false)}>
                  Fermer
                </Button>
             </div>
             <p className="mt-6 text-[9px] text-slate-400 font-bold uppercase italic">* Note : Une option d'archivage sera disponible dans la version 3.0</p>
          </Card>
        </div>
      )}
    </div>
  );
};
