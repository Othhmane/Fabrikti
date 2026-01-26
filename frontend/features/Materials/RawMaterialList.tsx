
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FabriktiService } from '../../api/services';
import { Card, Button, Input, Badge, ResponsiveGrid } from '../../components/UI';
import { Layers, Plus, Trash2, Edit2, Truck, X, Search, AlertTriangle } from 'lucide-react';
import { PaymentStatus, RawMaterial } from '../../types';

const UNITS = ['kg', 'g', 'm²', 'cm', 'litre', 'pièce', 'autre'];

export const RawMaterialList: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<RawMaterial | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<RawMaterial> | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');

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
      setIsModalOpen(false);
      setEditingItem(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => FabriktiService.delete('materials', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  });

  const handleDeleteRequest = (item: RawMaterial) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Matières Premières</h2>
          <p className="text-gray-500 font-medium">Gestion du stock et approvisionnements atelier.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto h-12 px-6">
          <Plus size={18} /> Ajouter une matière
        </Button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
        <Input 
          placeholder="Rechercher par nom, fournisseur ou unité..." 
          className="pl-12 h-12 rounded-xl border-slate-200 focus:ring-blue-100 font-medium bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <ResponsiveGrid>
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-40 bg-gray-200 animate-pulse rounded-xl"></div>)
        ) : filteredMaterials.map(m => {
          const supplier = suppliers?.find(s => s.id === m.supplierId);
          return (
            <Card key={m.id} className="p-5 flex flex-col h-full hover:border-blue-300 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><Layers size={20} /></div>
                <Badge color={m.stock < 10 ? 'red' : 'green'}>{m.stock} {m.unit}</Badge>
              </div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">{m.name}</h3>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Truck size={12}/> {supplier?.name || 'Inconnu'}
              </div>
              <p className="text-sm text-gray-500 mb-4">{m.pricePerUnit} € / {m.unit}</p>
              <div className="flex gap-2 border-t pt-4 mt-auto">
                <Button variant="secondary" className="flex-1 text-xs py-1.5" onClick={() => { setEditingItem(m); setIsModalOpen(true); }}>
                  <Edit2 size={14} /> Modifier
                </Button>
                <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" onClick={() => handleDeleteRequest(m)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          );
        })}
      </ResponsiveGrid>

      {/* MODAL RESPONSIVE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <Card className="w-full max-w-md p-6 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col relative overflow-hidden my-auto">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-xl font-bold">{editingItem ? 'Modifier' : 'Ajouter'} une Matière</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2"><X size={24}/></button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              saveMutation.mutate({
                id: editingItem?.id,
                name: formData.get('name') as string,
                unit: formData.get('unit') as string,
                stock: Number(formData.get('stock')),
                pricePerUnit: Number(formData.get('price')),
                supplierId: formData.get('supplierId') as string,
                paymentStatus: PaymentStatus.PAYEE
              });
            }} className="space-y-5 overflow-y-auto pr-2 custom-scrollbar pb-2">
              <Input label="Nom de la matière" name="name" defaultValue={editingItem?.name} required />
              
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Fournisseur</label>
                <select name="supplierId" className="w-full border border-gray-300 h-12 rounded-lg px-4 text-sm font-medium focus:ring-4 focus:ring-blue-100 outline-none" defaultValue={editingItem?.supplierId}>
                  <option value="">Sélectionner un fournisseur</option>
                  {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Unité</label>
                  <select name="unit" className="w-full border border-gray-300 h-12 rounded-lg px-4 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-100 transition-all" defaultValue={editingItem?.unit || 'pièce'} required>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <Input label="Stock initial" name="stock" type="number" defaultValue={editingItem?.stock} required />
              </div>

              <Input label="Prix unitaire (€)" name="price" type="number" step="0.01" defaultValue={editingItem?.pricePerUnit} required />
              
              <div className="flex flex-col sm:flex-row gap-3 pt-4 shrink-0">
                <Button type="button" variant="secondary" className="w-full sm:flex-1 h-12" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                <Button type="submit" className="w-full sm:flex-1 h-12 font-bold" isLoading={saveMutation.isPending}>Enregistrer</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
