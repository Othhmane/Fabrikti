
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FabriktiService } from '../../api/services';
import { Card, Button, Input, Badge } from '../../components/UI';
import { Truck, Plus, Mail, Trash2, Search, X, AlertTriangle } from 'lucide-react';
import { Supplier } from '../../types';

export const SupplierList: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  
  // Recherche
  const [searchTerm, setSearchTerm] = useState('');

  const { data: suppliers, isLoading } = useQuery({ queryKey: ['suppliers'], queryFn: FabriktiService.getSuppliers });
  const { data: materials } = useQuery({ queryKey: ['materials'], queryFn: FabriktiService.getRawMaterials });

  const saveMutation = useMutation({
    mutationFn: FabriktiService.saveSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsModalOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => FabriktiService.delete('suppliers', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsDeleteModalOpen(false);
      setSupplierToDelete(null);
    }
  });

  const handleDeleteRequest = (s: Supplier) => {
    setSupplierToDelete(s);
    setIsDeleteModalOpen(true);
  };

  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return [];
    return suppliers.filter(s => {
      const searchLower = searchTerm.toLowerCase();
      // Chercher par nom fournisseur
      const matchesName = s.name.toLowerCase().includes(searchLower);
      // Chercher par matières associées
      const associatedMaterials = materials?.filter(m => m.supplierId === s.id) || [];
      const matchesMaterials = associatedMaterials.some(m => m.name.toLowerCase().includes(searchLower));
      
      return matchesName || matchesMaterials;
    });
  }, [suppliers, materials, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Fournisseurs</h2>
          <p className="text-gray-500">Gestion de l'approvisionnement.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="h-11 px-6"><Plus size={18} /> Ajouter</Button>
      </div>

      {/* BARRE DE RECHERCHE */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
        <Input 
          placeholder="Rechercher par nom ou matière associée..." 
          className="pl-12 h-12 rounded-xl border-slate-200 focus:ring-blue-100 font-medium bg-white shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-56 bg-gray-100 animate-pulse rounded-xl"></div>)
        ) : filteredSuppliers.map(s => {
          const associatedCount = materials?.filter(m => m.supplierId === s.id).length || 0;
          return (
            <Card key={s.id} className="p-6 flex flex-col h-full hover:border-blue-300 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-100 rounded-xl"><Truck size={24} className="text-slate-600" /></div>
                <Badge color="gray">{associatedCount} matières</Badge>
              </div>
              <h3 className="text-lg font-bold">{s.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                <Mail size={14} /> {s.contact}
              </div>
              <div className="flex gap-2 mt-auto pt-6">
                <Button variant="secondary" className="flex-1 text-xs">Modifier</Button>
                <Button variant="ghost" onClick={() => handleDeleteRequest(s)} title="Supprimer">
                  <Trash2 size={16} className="text-red-500" />
                </Button>
              </div>
            </Card>
          );
        })}
        {filteredSuppliers.length === 0 && !isLoading && (
          <div className="col-span-full py-16 text-center text-slate-400 italic font-medium bg-white rounded-xl border-2 border-dashed border-slate-100 uppercase text-xs tracking-widest">
            Aucun fournisseur trouvé.
          </div>
        )}
      </div>

      {/* MODAL AJOUT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 rounded-2xl shadow-2xl">
            <h3 className="text-xl font-bold mb-6">Nouveau Fournisseur</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              saveMutation.mutate({
                name: formData.get('name') as string,
                contact: formData.get('contact') as string,
                rawMaterials: []
              });
            }} className="space-y-4">
              <Input name="name" label="Nom" placeholder="Raison sociale" required />
              <Input name="contact" label="Email / Contact" placeholder="contact@fournisseur.com" required />
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                <Button type="submit" className="flex-1" isLoading={saveMutation.isPending}>Enregistrer</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL DE CONFIRMATION DE SUPPRESSION */}
      {isDeleteModalOpen && supplierToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <Card className="w-full max-w-md p-8 rounded-[32px] border-none shadow-2xl text-center">
             <div className="mx-auto w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                <AlertTriangle size={32} />
             </div>
             <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Supprimer le fournisseur ?</h3>
             <p className="text-slate-500 text-sm mb-8">
               Le fournisseur <span className="font-black text-slate-900">{supplierToDelete.name}</span> sera supprimé.
               <br/><span className="text-[10px] text-red-400 font-bold uppercase tracking-widest mt-2 block italic">Attention : vérifiez les matières liées avant de confirmer.</span>
             </p>
             <div className="flex gap-3">
                <Button variant="secondary" className="flex-1 h-12 rounded-xl font-black uppercase text-xs" onClick={() => { setIsDeleteModalOpen(false); setSupplierToDelete(null); }}>Annuler</Button>
                <Button variant="danger" className="flex-1 h-12 rounded-xl font-black uppercase text-xs" onClick={() => deleteMutation.mutate(supplierToDelete.id)} isLoading={deleteMutation.isPending}>
                  Confirmer la suppression
                </Button>
             </div>
          </Card>
        </div>
      )}
    </div>
  );
};
