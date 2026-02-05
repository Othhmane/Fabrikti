import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, Button, Input } from '../../components/UI';
import {
  Search, Plus, Edit, Trash2, X, Package,
  AlertTriangle, Info, Tag, DollarSign, Database
} from 'lucide-react';
import { ProductConsumption } from '../../types';
import { supabase } from '../../api/supabase'; // <-- adapte le chemin si nécessaire

const CATEGORIES = ['Semelle', 'Semelle neo','Semelle injectée ','Première', 'Première doublée','Première tucson','Première synderme'];
const UNITS = ['paire', 'feuille', 'unité', 'm²', 'cm', 'kg', 'litre'];

const productSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  category: z.string().min(1, "La catégorie est requise"),
  unit: z.string().min(1, "L'unité est requise"),
  pricePerUnit: z.number().min(0, "Le prix doit être positif"),
});

type ProductFormData = z.infer<typeof productSchema>;

export const ProductManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [formula, setFormula] = useState<ProductConsumption[]>([]);

  const {
    register, handleSubmit, reset, setValue, formState: { errors }
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema)
  });

  // Fetch products with their consumption formula
  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      // products
      const { data: productsData, error: pErr } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (pErr) throw pErr;

      // product_consumption
      const { data: pcData, error: pcErr } = await supabase
        .from('product_consumption')
        .select('*');
      if (pcErr) throw pcErr;

      // materials map (to display names in details; component already queries materials separately but keep mapping)
      const { data: materialsData, error: mErr } = await supabase
        .from('materials')
        .select('*');
      if (mErr) throw mErr;

      const consumptionsByProduct: Record<string, ProductConsumption[]> = {};
      pcData?.forEach((c: any) => {
        if (!consumptionsByProduct[c.product_id]) consumptionsByProduct[c.product_id] = [];
        consumptionsByProduct[c.product_id].push({
          materialId: c.material_id,
          quantity: c.quantity
        });
      });

      return (productsData || []).map((p: any) => ({
        ...p,
        // map DB snake_case -> UI camelCase
        pricePerUnit: p.price_per_unit,
        consumptionFormula: consumptionsByProduct[p.id] || []
      }));
    }
  });

  // Fetch materials
  const { data: materials } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const { data, error } = await supabase.from('materials').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  // Save (create or update) product + consumption formula
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // data contains name, category, unit, pricePerUnit
      if (data.id) {
        // Update product
        const { error: upErr } = await supabase
          .from('products')
          .update({
            name: data.name,
            category: data.category,
            unit: data.unit,
            price_per_unit: data.pricePerUnit
          })
          .eq('id', data.id);
        if (upErr) throw upErr;

        // Replace consumption rows: delete old ones then insert new
        const { error: delErr } = await supabase
          .from('product_consumption')
          .delete()
          .eq('product_id', data.id);
        if (delErr) throw delErr;

        const rows = (data.consumptionFormula || []).map((f: any) => ({
          product_id: data.id,
          material_id: f.materialId,
          quantity: f.quantity
        }));
        if (rows.length > 0) {
          const { error: insErr } = await supabase
            .from('product_consumption')
            .insert(rows);
          if (insErr) throw insErr;
        }

        return { id: data.id };
      } else {
        // Insert product then insert consumption rows
        const { data: inserted, error: insErr } = await supabase
          .from('products')
          .insert([{
            name: data.name,
            category: data.category,
            unit: data.unit,
            price_per_unit: data.pricePerUnit
          }])
          .select()
          .single();
        if (insErr) throw insErr;

        const productId = inserted.id;
        const rows = (data.consumptionFormula || []).map((f: any) => ({
          product_id: productId,
          material_id: f.materialId,
          quantity: f.quantity
        }));
        if (rows.length > 0) {
          const { error: pcInsErr } = await supabase
            .from('product_consumption')
            .insert(rows);
          if (pcInsErr) throw pcInsErr;
        }
        return { id: productId };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product_consumption'] });
      closeFormModal();
    }
  });

  // Delete product (and its consumption rows)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // delete consumption rows first
      const { error: delPcErr } = await supabase
        .from('product_consumption')
        .delete()
        .eq('product_id', id);
      if (delPcErr) throw delPcErr;

      const { error: delProdErr } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      if (delProdErr) throw delProdErr;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsDeleteModalOpen(false);
      setSelectedProduct(null);
    }
  });

  const openFormModal = (product: any | null = null) => {
    setSelectedProduct(product);
    if (product) {
      setValue('name', product.name);
      setValue('category', product.category);
      setValue('unit', product.unit);
      setValue('pricePerUnit', product.pricePerUnit);
      setFormula(product.consumptionFormula || []);
    } else {
      reset();
      setFormula([]);
    }
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedProduct(null);
    setFormula([]);
    reset();
  };

  const handleDeleteClick = (product: any) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const openDetailsModal = (product: any) => {
    setSelectedProduct(product);
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedProduct(null);
  };

  const addMaterialToFormula = () => {
    setFormula([...formula, { materialId: '', quantity: 1 }]);
  };

  const updateFormulaItem = (index: number, field: keyof ProductConsumption, value: string | number) => {
    const newFormula = [...formula];
    newFormula[index] = { ...newFormula[index], [field]: value } as ProductConsumption;
    setFormula(newFormula);
  };

  const removeFormulaItem = (index: number) => {
    setFormula(formula.filter((_, i) => i !== index));
  };

  const filteredProducts = (products || []).filter((p: any) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-[#F8F9FC] min-h-screen font-sans">
      {/* HEADER TITLE */}
      <div className="bg-white border-b border-slate-200 px-6 md:px-10 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900">Produits</h1>
          <p className="text-sm text-slate-500 mt-2">Gestion du catalogue produits</p>
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
              placeholder="Rechercher par nom ou catégorie..."
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
            Nouveau Produit
          </button>
        </div>

        {/* PRODUCT GRID */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-64 bg-white border border-slate-200 animate-pulse rounded-2xl"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product: any) => (
              <div key={product.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition-all shadow-sm group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center text-indigo-600 font-bold text-lg border border-indigo-200">
                    <Package size={24} />
                  </div>
                  <div className="flex gap-2 transition-opacity">
                    <button
                      onClick={() => openFormModal(product)}
                      className="p-2 text-yellow-600 bg-yellow-50 hover:bg-yellow-100 rounded-lg border border-yellow-200 transition-all font-semibold"
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(product)}
                      className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-all font-semibold"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-3">{product.name}</h3>

                <div className="space-y-2.5 mb-4 text-sm">
                  <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg text-slate-700">
                    <Tag size={16} className="text-blue-600 shrink-0" />
                    <span className="truncate text-xs font-medium">{product.category} • {product.unit}</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-emerald-50 rounded-lg text-slate-700">
                    <DollarSign size={16} className="text-emerald-600 shrink-0" />
                    <span className="text-xs font-medium">{product.pricePerUnit}DA / {product.unit}</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg text-slate-700">
                    <Database size={16} className="text-amber-600 shrink-0" />
                    <span className="truncate text-xs font-medium">{product.consumptionFormula?.length || 0} matière(s) première(s)</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-semibold text-slate-500">Actif</span>
                  </div>
                  <button
                    onClick={() => openDetailsModal(product)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-all"
                  >
                    <Info size={12} />
                    Détails
                  </button>
                </div>
              </div>
            ))}

            {filteredProducts.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white border border-slate-200 rounded-2xl">
                <Package size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-semibold">Aucun produit trouvé</p>
                <p className="text-slate-400 text-sm mt-1">Essayez un autre terme de recherche</p>
              </div>
            )}
          </div>
        )}

        {/* MODAL FORMULAIRE */}
        {isFormModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 my-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedProduct ? 'Modifier le produit' : 'Nouveau produit'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Informations du produit</p>
                </div>
                <button onClick={closeFormModal} className="p-2 hover:bg-slate-100 rounded-lg transition-all">
                  <X size={20} className="text-slate-600" />
                </button>
              </div>

              <form onSubmit={handleSubmit((data) => {
                // prepare payload for supabase
                saveMutation.mutate({
                  id: selectedProduct?.id,
                  ...data,
                  consumptionFormula: formula
                });
              })} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Nom du produit</label>
                  <input
                    placeholder="ex: Semelle orthopédique"
                    {...register('name')}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Catégorie</label>
                    <select
                      {...register('category')}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.category && <p className="text-xs text-rose-500 mt-1">{errors.category.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Unité</label>
                    <select
                      {...register('unit')}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    {errors.unit && <p className="text-xs text-rose-500 mt-1">{errors.unit.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Prix unitaire (DA)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('pricePerUnit', { valueAsNumber: true })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  {errors.pricePerUnit && <p className="text-xs text-rose-500 mt-1">{errors.pricePerUnit.message}</p>}
                </div>

                {/* Composition technique */}
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Database size={16} className="text-indigo-600"/> Composition Technique
                    </p>
                    <button
                      type="button"
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-all"
                      onClick={addMaterialToFormula}
                    >
                      + Matière
                    </button>
                  </div>

                  {formula.map((item, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <select
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
                          value={item.materialId}
                          onChange={(e) => updateFormulaItem(index, 'materialId', e.target.value)}
                          required
                        >
                          <option value="">-- Sélectionner une matière --</option>
                          {materials?.map((m: any) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                        </select>
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Qté"
                          value={item.quantity}
                          onChange={(e) => updateFormulaItem(index, 'quantity', Number(e.target.value))}
                          required
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFormulaItem(index)}
                        className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <X size={18}/>
                      </button>
                    </div>
                  ))}

                  {formula.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-2">Aucune matière première ajoutée</p>
                  )}
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
                    disabled={saveMutation.isLoading}
                    className="flex-1 px-4 py-2.5 bg-[#6366F1] text-white rounded-xl text-sm font-semibold hover:bg-[#5558E3] transition-all disabled:opacity-50"
                  >
                    {saveMutation.isLoading ? 'Enregistrement...' : (selectedProduct ? 'Mettre à jour' : 'Enregistrer')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL CONFIRMATION SUPPRESSION */}
        {isDeleteModalOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-center">
              <div className="mx-auto w-14 h-14 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4">
                <AlertTriangle size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Supprimer le produit ?</h3>
              <p className="text-sm text-slate-600 mb-6">
                Vous êtes sur le point de supprimer <span className="font-bold">"{selectedProduct.name}"</span>. Cette action est irréversible.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={() => deleteMutation.mutate(selectedProduct.id)}
                  disabled={deleteMutation.isLoading}
                  className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition-all disabled:opacity-50"
                >
                  {deleteMutation.isLoading ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DETAILS NOMENCLATURE */}
        {isDetailsModalOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 my-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Détails du produit</h3>
                  <p className="text-sm text-slate-500 mt-1">Nomenclature technique</p>
                </div>
                <button onClick={closeDetailsModal} className="p-2 hover:bg-slate-100 rounded-lg transition-all">
                  <X size={20} className="text-slate-600" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Informations produit */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Informations</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-600">Nom</span>
                      <span className="text-xs font-medium text-slate-900">{selectedProduct.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-600">Catégorie</span>
                      <span className="text-xs font-medium text-slate-900">{selectedProduct.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-600">Unité</span>
                      <span className="text-xs font-medium text-slate-900">{selectedProduct.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-600">Prix unitaire</span>
                      <span className="text-xs font-medium text-slate-900">{selectedProduct.pricePerUnit}DA</span>
                    </div>
                  </div>
                </div>

                {/* Nomenclature */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Database size={16} className="text-indigo-600" />
                    Composition Technique
                  </h4>
                  {selectedProduct.consumptionFormula && selectedProduct.consumptionFormula.length > 0 ? (
                    <div className="space-y-2">
                      {selectedProduct.consumptionFormula.map((item: any, idx: number) => {
                        const material = materials?.find((m: any) => m.id === item.materialId);
                        return (
                          <div key={idx} className="flex justify-between items-center p-2.5 bg-white rounded-lg border border-slate-200">
                            <span className="text-xs font-medium text-slate-900">{material?.name || 'Matière inconnue'}</span>
                            <span className="text-xs text-slate-600">{item.quantity} {material?.unit || ''}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-4">Aucune matière première associée</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  onClick={closeDetailsModal}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all"
                >
                  Fermer
                </button>
                <button
                  onClick={() => {
                    closeDetailsModal();
                    openFormModal(selectedProduct);
                  }}
                  className="flex-1 px-4 py-2.5 bg-[#6366F1] text-white rounded-xl text-sm font-semibold hover:bg-[#5558E3] transition-all"
                >
                  Modifier
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