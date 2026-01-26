
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FabriktiService } from '../../api/services';
import { Card, Button, Input, ResponsiveGrid } from '../../components/UI';
import { Scissors, Plus, Trash2, Hash, Maximize, Search, X } from 'lucide-react';
import { DieCutter } from '../../types';

export const DieCutterList: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Recherche
  const [searchTerm, setSearchTerm] = useState('');

  const { data: diecutters, isLoading } = useQuery({ queryKey: ['diecutters'], queryFn: FabriktiService.getDieCutters });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<DieCutter>) => FabriktiService.saveDieCutter(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diecutters'] });
      setIsModalOpen(false);
    }
  });

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Emporte-pièces</h2>
          <p className="text-gray-500">Gestion de vos outils de découpe et gabarits.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto h-11 px-6">
          <Plus size={18} /> Nouvel emporte-pièce
        </Button>
      </div>

      {/* BARRE DE RECHERCHE */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600 transition-colors" size={20} />
        <Input 
          placeholder="Rechercher par référence, taille ou matière..." 
          className="pl-12 h-12 rounded-xl border-slate-200 focus:ring-purple-100 font-medium bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <ResponsiveGrid>
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-56 bg-gray-100 animate-pulse rounded-xl"></div>)
        ) : filteredDiecutters.map(d => (
          <Card key={d.id} className="p-6 flex flex-col hover:border-purple-200 transition-all border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <div className="p-3 bg-purple-50 rounded-xl text-purple-600"><Scissors size={20} /></div>
              <span className="text-xs font-mono font-bold text-gray-400">#{d.id.slice(0,6)}</span>
            </div>
            <h3 className="text-lg font-bold mb-1">{d.reference}</h3>
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-500"><Maximize size={14}/> Taille : {d.size}</div>
              <div className="flex items-center gap-2 text-sm text-gray-500"><Hash size={14}/> Matière : {d.material}</div>
            </div>
            <div className="mt-auto">
              <Button variant="ghost" className="w-full text-red-500 hover:bg-red-50 py-2" onClick={() => confirm('Supprimer cet outil ?') && FabriktiService.delete('diecutters', d.id).then(() => queryClient.invalidateQueries({queryKey:['diecutters']}))}>
                <Trash2 size={16} /> Supprimer
              </Button>
            </div>
          </Card>
        ))}
        {filteredDiecutters.length === 0 && !isLoading && (
          <div className="col-span-full py-16 text-center text-slate-400 italic font-medium bg-white rounded-xl border-2 border-dashed border-slate-100 uppercase text-xs tracking-widest">
            Aucun emporte-pièce trouvé.
          </div>
        )}
      </ResponsiveGrid>

      {/* MODAL AJOUT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 rounded-t-3xl sm:rounded-xl shadow-2xl animate-in slide-in-from-bottom duration-300 border-none">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Nouvel Emporte-pièce</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400"/></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              saveMutation.mutate({
                reference: formData.get('ref') as string,
                size: formData.get('size') as string,
                material: formData.get('material') as string,
              });
            }} className="space-y-4">
              <Input label="Référence" name="ref" placeholder="ex: CUT-X88" required />
              <Input label="Dimensions" name="size" placeholder="ex: 120x80 cm" required />
              <Input label="Matière de l'outil" name="material" placeholder="ex: Acier" required />
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" className="flex-1 h-12 rounded-xl" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                <Button type="submit" className="flex-1 h-12 rounded-xl bg-purple-600 hover:bg-purple-700" isLoading={saveMutation.isPending}>Enregistrer</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
