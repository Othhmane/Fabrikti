import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FabriktiService } from '../../api/services';
import { Truck, Plus, Mail, Trash2, Search, X, AlertTriangle, Edit, Package } from 'lucide-react';
import { Supplier } from '../../types';

export const SupplierList: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  
  // Recherche
  const [searchTerm, setSearchTerm] = useState('');

  const { data: suppliers, isLoading } = useQuery({ queryKey: ['suppliers'], queryFn: FabriktiService.getSuppliers });
  const { data: materials } = useQuery({ queryKey: ['materials'], queryFn: FabriktiService.getRawMaterials });

  const saveMutation = useMutation({
    mutationFn: FabriktiService.saveSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      closeFormModal();
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

  const openFormModal = (supplier: Supplier | null = null) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  };

  const closeFormModal = () => {
    setIsModalOpen(false);
    setSelectedSupplier(null);
  };

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
    <div className="bg-[#F8F9FC] min-h-screen font-sans">
      {/* HEADER TITLE */}
      <div className="bg-white border-b border-slate-200 px-6 md:px-10 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900">Fournisseurs</h1>
          <p className="text-sm text-slate-500 mt-2">Gestion de l'approvisionnement</p>
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
                placeholder="Rechercher par nom ou matière associée..."
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
              Nouveau Fournisseur
            </button>
          </div>

          {/* SUPPLIER GRID */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="h-64 bg-white border border-slate-200 animate-pulse rounded-2xl"></div>)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSuppliers.map(s => {
                const associatedCount = materials?.filter(m => m.supplierId === s.id).length || 0;
                return (
                  <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition-all shadow-sm group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center text-indigo-600 font-bold text-lg border border-indigo-200">
                        <Truck size={20} />
                      </div>
                      <div className="flex gap-2 transition-opacity">
                        <button
                          onClick={() => openFormModal(s)}
                          className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all font-semibold"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRequest(s)}
                          className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-all font-semibold"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-3">{s.name}</h3>

                    <div className="space-y-2.5 mb-4 text-sm">
                      <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg text-slate-700">
                        <Mail size={16} className="text-blue-600 shrink-0" />
                        <span className="truncate text-xs font-medium">{s.contact}</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-emerald-50 rounded-lg text-slate-700">
                        <Package size={16} className="text-emerald-600 shrink-0" />
                        <span className="text-xs font-medium">{associatedCount} matières associées</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-xs font-semibold text-slate-500">Actif</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredSuppliers.length === 0 && (
                <div className="col-span-full py-16 text-center bg-white border border-slate-200 rounded-2xl">
                  <Truck size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-semibold">Aucun fournisseur trouvé</p>
                  <p className="text-slate-400 text-sm mt-1">Essayez un autre terme de recherche</p>
                </div>
              )}
            </div>
          )}

          {/* MODAL AJOUT/MODIFICATION */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {selectedSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Informations du fournisseur</p>
                  </div>
                  <button onClick={closeFormModal} className="p-2 hover:bg-slate-100 rounded-lg transition-all">
                    <X size={20} className="text-slate-600" />
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  saveMutation.mutate({
                    id: selectedSupplier?.id,
                    name: formData.get('name') as string,
                    contact: formData.get('contact') as string,
                    rawMaterials: selectedSupplier?.rawMaterials || []
                  });
                }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Nom du fournisseur</label>
                    <input
                      name="name"
                      placeholder="ex: Résines Pro"
                      defaultValue={selectedSupplier?.name}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Email / Contact</label>
                    <input
                      name="contact"
                      placeholder="contact@fournisseur.com"
                      defaultValue={selectedSupplier?.contact}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      required
                    />
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
                      {saveMutation.isPending ? 'Enregistrement...' : (selectedSupplier ? 'Mettre à jour' : 'Enregistrer')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL DE CONFIRMATION DE SUPPRESSION */}
          {isDeleteModalOpen && supplierToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-center">
                <div className="mx-auto w-14 h-14 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4">
                  <AlertTriangle size={28} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Supprimer le fournisseur ?</h3>
                <p className="text-sm text-slate-600 mb-6">
                  Vous êtes sur le point de supprimer <span className="font-bold">"{supplierToDelete.name}"</span>. Cette action est irréversible.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setIsDeleteModalOpen(false); setSupplierToDelete(null); }}
                    className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(supplierToDelete.id)}
                    disabled={deleteMutation.isPending}
                    className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition-all disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
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