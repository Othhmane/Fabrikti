
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FabriktiService } from '../../api/services';
import { Card, Button, Input, Badge, ResponsiveGrid } from '../../components/UI';
import { Plus, Package, Database, Info, Trash2, Edit, X, Tag, DollarSign, AlertTriangle } from 'lucide-react';
import { ProductConsumption } from '../../types';

const CATEGORIES = ['Semelle', 'Semelle de propreté', 'Talon', 'Accessoire', 'Autre'];
const UNITS = ['paire', 'unité', 'm²', 'cm', 'kg', 'litre'];

export const ProductManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formula, setFormula] = useState<ProductConsumption[]>([]);

  const { data: products, isLoading } = useQuery({ queryKey: ['products'], queryFn: FabriktiService.getProducts });
  const { data: materials } = useQuery({ queryKey: ['materials'], queryFn: FabriktiService.getRawMaterials });

  const saveMutation = useMutation({
    mutationFn: (data: any) => FabriktiService.saveProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => FabriktiService.delete('products', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
    }
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormula([]);
  };

  const openEdit = (p: any) => {
    setEditingProduct(p);
    setFormula(p.consumptionFormula || []);
    setIsModalOpen(true);
  };

  const addMaterialToFormula = () => {
    setFormula([...formula, { materialId: '', quantity: 1 }]);
  };

  const updateFormulaItem = (index: number, field: keyof ProductConsumption, value: string | number) => {
    const newFormula = [...formula];
    newFormula[index] = { ...newFormula[index], [field]: value };
    setFormula(newFormula);
  };

  const removeFormulaItem = (index: number) => {
    setFormula(formula.filter((_, i) => i !== index));
  };

  const handleDeleteConfirm = (product: any) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Catalogue Produits</h2>
          <p className="text-slate-500 font-medium italic text-sm">Gestion des références et nomenclatures atelier.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="h-12 px-6 shadow-xl shadow-blue-500/20">
          <Plus size={18} /> Nouveau Produit
        </Button>
      </div>

      {isLoading ? (
        <ResponsiveGrid>
          {[1,2,3,4].map(i => <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-2xl"></div>)}
        </ResponsiveGrid>
      ) : (
        <ResponsiveGrid className="lg:grid-cols-3">
          {products?.map((product) => (
            <Card key={product.id} className="p-0 flex flex-col group overflow-hidden border-slate-200">
              <div className="relative h-48 bg-slate-100 flex items-center justify-center border-b border-slate-100 group-hover:bg-slate-50 transition-colors">
                <Package size={50} className="text-slate-300 group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute top-4 left-4 flex flex-col gap-1">
                   <Badge color="blue">{product.category}</Badge>
                   <Badge color="gray">{product.pricePerUnit}€ / {product.unit}</Badge>
                </div>
              </div>
              <div className="flex-1 p-6 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-black text-slate-900 leading-tight uppercase tracking-tighter">{product.name}</h3>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-slate-400 hover:text-blue-600" onClick={() => openEdit(product)} title="Modifier"><Edit size={16}/></button>
                    <button className="p-2 text-slate-400 hover:text-red-600" onClick={() => handleDeleteConfirm(product)} title="Supprimer">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-2">
                    <Database size={12} /> Nomenclature Technique
                  </p>
                  <div className="space-y-1">
                    {product.consumptionFormula && product.consumptionFormula.length > 0 ? (
                      product.consumptionFormula.map((f: any, idx: number) => {
                        const m = materials?.find(mat => mat.id === f.materialId);
                        return (
                          <div key={idx} className="flex justify-between text-xs font-bold text-slate-600">
                            <span>{m?.name || 'Inconnue'}</span>
                            <span className="text-slate-400">{f.quantity} {m?.unit || ''}</span>
                          </div>
                        );
                      })
                    ) : <p className="text-xs text-slate-400 italic">Aucune matière liée.</p>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </ResponsiveGrid>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <Card className="w-full max-w-xl p-8 rounded-[32px] shadow-2xl my-auto border-none">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{editingProduct ? 'Modifier' : 'Nouveau'} Produit</h3>
               <button onClick={closeModal} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900"><X size={24}/></button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              saveMutation.mutate({
                id: editingProduct?.id,
                name: formData.get('name') as string,
                category: formData.get('category') as string,
                unit: formData.get('unit') as string,
                pricePerUnit: Number(formData.get('pricePerUnit')),
                consumptionFormula: formula.filter(f => f.materialId !== '')
              });
            }} className="space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Input label="Désignation" name="name" defaultValue={editingProduct?.name} required className="rounded-2xl h-14" />
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Catégorie</label>
                  <select name="category" defaultValue={editingProduct?.category} className="w-full h-14 border border-gray-300 rounded-2xl px-4 outline-none focus:ring-4 focus:ring-blue-100" required>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Unité</label>
                  <select name="unit" defaultValue={editingProduct?.unit} className="w-full h-14 border border-gray-300 rounded-2xl px-4 outline-none focus:ring-4 focus:ring-blue-100" required>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <Input label="Prix Unitaire (€)" name="pricePerUnit" type="number" step="0.01" defaultValue={editingProduct?.pricePerUnit} required className="rounded-2xl h-14" icon={<DollarSign size={18}/>} />
              </div>
              
              <div className="p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-black text-slate-700 uppercase tracking-tight flex items-center gap-2">
                    <Database size={16} className="text-blue-500"/> Composition Technique
                  </p>
                  <Button type="button" variant="secondary" className="text-[10px] font-black uppercase h-8 px-4 rounded-xl" onClick={addMaterialToFormula}>
                    + Matière
                  </Button>
                </div>
                
                {formula.map((item, index) => (
                  <div key={index} className="flex gap-3 items-end">
                    <div className="flex-1 space-y-1">
                      <select 
                        className="w-full border-slate-200 rounded-xl p-3 text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-blue-100"
                        value={item.materialId}
                        onChange={(e) => updateFormulaItem(index, 'materialId', e.target.value)}
                        required
                      >
                        <option value="">-- Matière --</option>
                        {materials?.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                      </select>
                    </div>
                    <div className="w-24">
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="Qté"
                        value={item.quantity} 
                        onChange={(e) => updateFormulaItem(index, 'quantity', Number(e.target.value))}
                        required
                        className="rounded-xl p-3 h-[46px]"
                      />
                    </div>
                    <button type="button" onClick={() => removeFormulaItem(index)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl">
                      <X size={20}/>
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="secondary" className="flex-1 h-14 rounded-2xl font-black uppercase" onClick={closeModal}>Annuler</Button>
                <Button type="submit" className="flex-1 h-14 rounded-2xl font-black uppercase shadow-xl shadow-blue-500/20" isLoading={saveMutation.isPending}>
                  {editingProduct ? 'Mettre à jour' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL DE CONFIRMATION DE SUPPRESSION */}
      {isDeleteModalOpen && productToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <Card className="w-full max-w-md p-8 rounded-[32px] border-none shadow-2xl text-center">
             <div className="mx-auto w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                <AlertTriangle size={32} />
             </div>
             <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Supprimer ce produit ?</h3>
             <p className="text-slate-500 text-sm mb-8">
               Le produit <span className="font-black text-slate-900">{productToDelete.name}</span> sera définitivement retiré du catalogue.
             </p>
             <div className="flex gap-3">
                <Button variant="secondary" className="flex-1 h-12 rounded-xl font-black uppercase text-xs" onClick={() => { setIsDeleteModalOpen(false); setProductToDelete(null); }}>Annuler</Button>
                <Button variant="danger" className="flex-1 h-12 rounded-xl font-black uppercase text-xs" onClick={() => deleteMutation.mutate(productToDelete.id)} isLoading={deleteMutation.isPending}>
                  Confirmer la suppression
                </Button>
             </div>
          </Card>
        </div>
      )}
    </div>
  );
};
