import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FabriktiService } from '../../api/services';
import { Card, Button, Input } from '../../components/UI';
import { Scissors, Plus, Trash2, Hash, Maximize, Search, X, Edit, AlertTriangle, Info } from 'lucide-react';
import { DieCutter } from '../../types';

export const DieCutterList: React.FC = () => {
  const queryClient = useQueryClient();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDieCutter, setSelectedDieCutter] = useState<DieCutter | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ reference: '', size: '', material: '' });

  const { data: diecutters, isLoading } = useQuery({ 
    queryKey: ['diecutters'], 
    queryFn: FabriktiService.getDieCutters 
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<DieCutter>) => FabriktiService.saveDieCutter(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diecutters'] });
      closeFormModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => FabriktiService.delete('diecutters', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diecutters'] });
      setIsDeleteModalOpen(false);
      setSelectedDieCutter(null);
    }
  });

  const openFormModal = (dieCutter: DieCutter | null = null) => {
    setSelectedDieCutter(dieCutter);
    if (dieCutter) {
      setFormData({
        reference: dieCutter.reference,
        size: dieCutter.size,
        material: dieCutter.material
      });
    } else {
      setFormData({ reference: '', size: '', material: '' });
    }
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedDieCutter(null);
    setFormData({ reference: '', size: '', material: '' });
  };

  const handleDeleteClick = (dieCutter: DieCutter) => {
    setSelectedDieCutter(dieCutter);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      id: selectedDieCutter?.id
    });
  };

  const filteredDiecutters = useMemo(() => {
    if (!diecutters) return [];
    const lowerSearch = searchTerm.toLowerCase();
    return diecutters.filter(d => 
      d.reference.toLowerCase().includes(lowerSearch) ||
      d.size.toLowerCase().includes(lowerSearch) ||
      d.material.toLowerCase().includes(lowerSearch)
    );
  }, [diecutters, searchTerm]);

  return (
    <div className="bg-[#F8F9FC] min-h-screen font-sans">
      {/* HEADER TITLE */}
      <div className="bg-white border-b border-slate-200 px-6 md:px-10 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900">Emporte-pièces</h1>
          <p className="text-sm text-slate-500 mt-2">Gestion de vos outils de découpe et gabarits</p>
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
                placeholder="Rechercher par référence, taille ou matière..."
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
              Nouvel emporte-pièce
            </button>
          </div>

          {/* DIECUTTERS GRID */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="h-64 bg-white border border-slate-200 animate-pulse rounded-2xl"></div>)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDiecutters?.map((dieCutter) => (
                <div key={dieCutter.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition-all shadow-sm group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center text-indigo-600 font-bold text-lg border border-indigo-200">
                      <Scissors size={20} />
                    </div>
                    <div className="flex gap-2 transition-opacity">
                      <button
                        onClick={() => openFormModal(dieCutter)}
                        className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all font-semibold"
                        title="Modifier"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(dieCutter)}
                        className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-all font-semibold"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-3">{dieCutter.reference}</h3>

                  <div className="space-y-2.5 mb-4 text-sm">
                    <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg text-slate-700">
                      <Maximize size={16} className="text-blue-600 shrink-0" />
                      <span className="truncate text-xs font-medium">{dieCutter.size}</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-emerald-50 rounded-lg text-slate-700">
                      <Hash size={16} className="text-emerald-600 shrink-0" />
                      <span className="text-xs font-medium">{dieCutter.material}</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg text-slate-700">
                      <Hash size={16} className="text-amber-600 shrink-0" />
                      <span className="truncate text-xs font-mono font-medium">#{dieCutter.id.slice(0, 8)}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-xs font-semibold text-slate-500">Actif</span>
                    </div>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-all">
                      Détails
                    </button>
                  </div>
                </div>
              ))}

              {filteredDiecutters?.length === 0 && (
                <div className="col-span-full py-16 text-center bg-white border border-slate-200 rounded-2xl">
                  <Scissors size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-semibold">Aucun emporte-pièce trouvé</p>
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
                      {selectedDieCutter ? 'Modifier l\'emporte-pièce' : 'Nouvel emporte-pièce'}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Informations de l'outil</p>
                  </div>
                  <button onClick={closeFormModal} className="p-2 hover:bg-slate-100 rounded-lg transition-all">
                    <X size={20} className="text-slate-600" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Référence</label>
                    <input
                      placeholder="ex: CUT-X88"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Dimensions</label>
                      <input
                        placeholder="ex: 120x80 cm"
                        value={formData.size}
                        onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Matière</label>
                      <input
                        placeholder="ex: Acier"
                        value={formData.material}
                        onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
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
                      {saveMutation.isPending ? 'Enregistrement...' : (selectedDieCutter ? 'Mettre à jour' : 'Enregistrer')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL CONFIRMATION SUPPRESSION */}
          {isDeleteModalOpen && selectedDieCutter && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-center">
                <div className="mx-auto w-14 h-14 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4">
                  <AlertTriangle size={28} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Supprimer l'emporte-pièce ?</h3>
                <p className="text-sm text-slate-600 mb-6">
                  Vous êtes sur le point de supprimer <span className="font-bold">"{selectedDieCutter.reference}"</span>. Cette action est irréversible.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(selectedDieCutter.id)}
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