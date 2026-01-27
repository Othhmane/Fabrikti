import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FabriktiService } from '../../api/services';
import { 
  Search, Plus, Layers, Truck, Edit, Trash2, 
  X, AlertTriangle, Info, Package 
} from 'lucide-react';
import { PaymentStatus, RawMaterial } from '../../types';

const UNITS = ['kg', 'g', 'm²', 'cm', 'litre', 'pièce', 'autre'];

export const RawMaterialList: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: 'pièce',
    stock: 0,
    pricePerUnit: 0,
    supplierId: ''
  });

  const { data: materials, isLoading } = useQuery({ 
    queryKey: ['materials'], 
    queryFn: FabriktiService.getRawMaterials 
  });

  const { data: suppliers } = useQuery({ 
    queryKey: ['suppliers'], 
    queryFn: FabriktiService.getSuppliers 
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<RawMaterial>) => FabriktiService.saveRawMaterial(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      closeFormModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => FabriktiService.delete('materials', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setIsDeleteModalOpen(false);
      setSelectedMaterial(null);
    }
  });

  const openFormModal = (material: RawMaterial | null = null) => {
    setSelectedMaterial(material);
    if (material) {
      setFormData({
        name: material.name,
        unit: material.unit,
        stock: material.stock,
        pricePerUnit: material.pricePerUnit,
        supplierId: material.supplierId
      });
    } else {
      setFormData({
        name: '',
        unit: 'pièce',
        stock: 0,
        pricePerUnit: 0,
        supplierId: ''
      });
    }
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedMaterial(null);
    setFormData({
      name: '',
      unit: 'pièce',
      stock: 0,
      pricePerUnit: 0,
      supplierId: ''
    });
  };

  const handleDeleteClick = (material: RawMaterial) => {
    setSelectedMaterial(material);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      id: selectedMaterial?.id,
      ...formData,
      paymentStatus: PaymentStatus.PAYEE
    });
  };

  const filteredMaterials = useMemo(() => {
    if (!materials) return [];
    return materials.filter(m => {
      const supplier = suppliers?.find(s => s.id === m.supplierId);
      const searchLower = searchTerm.toLowerCase();
      return (
        m.name.toLowerCase().includes(searchLower) ||
        supplier?.name.toLowerCase().includes(searchLower) ||
        m.unit.toLowerCase().includes(searchLower)
      );
    });
  }, [materials, suppliers, searchTerm]);

  return (
    <div className="bg-[#F8F9FC] min-h-screen font-sans">
      {/* HEADER TITLE */}
      <div className="bg-white border-b border-slate-200 px-6 md:px-10 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900">Matières Premières</h1>
          <p className="text-sm text-slate-500 mt-2">Gestion du stock et approvisionnements atelier</p>
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
                placeholder="Rechercher par nom, fournisseur ou unité..."
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
              Nouvelle Matière
            </button>
          </div>

          {/* MATERIAL GRID */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="h-64 bg-white border border-slate-200 animate-pulse rounded-2xl"></div>)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMaterials?.map((material) => {
                const supplier = suppliers?.find(s => s.id === material.supplierId);
                return (
                  <div key={material.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition-all shadow-sm group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center text-indigo-600 font-bold text-lg border border-indigo-200">
                        <Layers size={20} />
                      </div>
                      <div className="flex gap-2 transition-opacity">
                        <button
                          onClick={() => openFormModal(material)}
                          className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all font-semibold"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(material)}
                          className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-all font-semibold"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-3">{material.name}</h3>

                    <div className="space-y-2.5 mb-4 text-sm">
                      <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg text-slate-700">
                        <Truck size={16} className="text-blue-600 shrink-0" />
                        <span className="truncate text-xs font-medium">{supplier?.name || 'Aucun fournisseur'}</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-emerald-50 rounded-lg text-slate-700">
                        <Package size={16} className="text-emerald-600 shrink-0" />
                        <span className="text-xs font-medium">{material.stock} {material.unit}</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg text-slate-700">
                        <span className="text-amber-600 shrink-0 font-bold text-xs">€</span>
                        <span className="truncate text-xs font-medium">{material.pricePerUnit} € / {material.unit}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${material.stock < 10 ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                        <span className="text-xs font-semibold text-slate-500">
                          {material.stock < 10 ? 'Stock faible' : 'Stock OK'}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-400">{material.unit}</span>
                    </div>
                  </div>
                );
              })}

              {filteredMaterials?.length === 0 && (
                <div className="col-span-full py-16 text-center bg-white border border-slate-200 rounded-2xl">
                  <Layers size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-semibold">Aucune matière première trouvée</p>
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
                      {selectedMaterial ? 'Modifier la matière' : 'Nouvelle matière'}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Informations de la matière première</p>
                  </div>
                  <button onClick={closeFormModal} className="p-2 hover:bg-slate-100 rounded-lg transition-all">
                    <X size={20} className="text-slate-600" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Nom de la matière</label>
                    <input
                      placeholder="ex: Résine époxy"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Fournisseur</label>
                    <select
                      value={formData.supplierId}
                      onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="">Sélectionner un fournisseur</option>
                      {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Unité</label>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData({...formData, unit: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        required
                      >
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Stock initial</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.stock}
                        onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Prix unitaire (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.pricePerUnit}
                      onChange={(e) => setFormData({...formData, pricePerUnit: Number(e.target.value)})}
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
                      {saveMutation.isPending ? 'Enregistrement...' : (selectedMaterial ? 'Mettre à jour' : 'Enregistrer')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL CONFIRMATION SUPPRESSION */}
          {isDeleteModalOpen && selectedMaterial && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-center">
                <div className="mx-auto w-14 h-14 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4">
                  <AlertTriangle size={28} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Supprimer la matière ?</h3>
                <p className="text-sm text-slate-600 mb-6">
                  Vous êtes sur le point de supprimer <span className="font-bold">"{selectedMaterial.name}"</span>. Cette action est irréversible.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(selectedMaterial.id)}
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