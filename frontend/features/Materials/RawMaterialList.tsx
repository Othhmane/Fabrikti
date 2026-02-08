import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, Plus, Layers, Truck, Edit, Trash2, 
  X, AlertTriangle, Info, Package, User, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';
import { supabase } from '../../api/supabase'; // adapte le chemin si besoin
import { Link } from 'react-router-dom';
import { PaymentStatus, RawMaterial, ProductConsumption, TransactionType } from '../../types';

const UNITS = ['kg', 'g', 'm²', 'cm', 'litre', 'pièce', 'plaque', 'paire', 'autre'];

export const RawMaterialList: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [historyMaterial, setHistoryMaterial] = useState<RawMaterial | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: 'plaque',
    stock: 0,
    pricePerUnit: 0,
    supplierId: ''
  });

  // Récupérer les matières premières
  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const { data, error } = await supabase.from('materials').select('*').order('name');
      if (error) throw error;
      return (data || []).map((m: any) => ({
        ...m,
        pricePerUnit: Number(m.price_per_unit ?? m.pricePerUnit ?? 0),
        supplierId: m.supplier_id ?? m.supplierId ?? null,
        stock: Number(m.stock ?? 0),
      }));
    }
  });

  // Récupérer les clients (fournisseurs)
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data: productsData, error: pErr } = await supabase.from('products').select('*');
      if (pErr) throw pErr;

      const { data: pcData, error: pcErr } = await supabase.from('product_consumption').select('*');
      if (pcErr) throw pcErr;

      const consumptionsByProduct: Record<string, ProductConsumption[]> = {};
      (pcData ?? []).forEach((c: any) => {
        if (!consumptionsByProduct[c.product_id]) consumptionsByProduct[c.product_id] = [];
        consumptionsByProduct[c.product_id].push({
          materialId: c.material_id,
          quantity: Number(c.quantity ?? 0),
        });
      });

      return (productsData || []).map((p: any) => ({
        ...p,
        pricePerUnit: p.price_per_unit ?? p.pricePerUnit,
        consumptionFormula: consumptionsByProduct[p.id] || [],
      }));
    }
  });

  const { data: ordersRaw = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*, order_items(*)');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  // Mutation sauvegarde (insert ou update)
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<RawMaterial>) => {
      if (data.id) {
        const { error } = await supabase
          .from('materials')
          .update({
            name: data.name,
            unit: data.unit,
            stock: data.stock,
            price_per_unit: data.pricePerUnit,
            supplier_id: data.supplierId
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('materials')
          .insert([{
            name: data.name,
            unit: data.unit,
            stock: data.stock,
            price_per_unit: data.pricePerUnit,
            supplier_id: data.supplierId
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      closeFormModal();
    }
  });

  // Mutation suppression
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) throw error;
    },
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
        unit: 'plaque',
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
      unit: 'plaque',
      stock: 0,
      pricePerUnit: 0,
      supplierId: ''
    });
  };

  const handleDeleteClick = (material: RawMaterial) => {
    setSelectedMaterial(material);
    setIsDeleteModalOpen(true);
  };

  const openHistoryModal = (material: RawMaterial) => {
    setHistoryMaterial(material);
    setIsHistoryModalOpen(true);
  };

  const closeHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setHistoryMaterial(null);
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
      const clientSupplier = clients?.find(c => c.id === m.supplierId || c.id === (m as any).supplier_id);
      const searchLower = searchTerm.toLowerCase();
      return (
        m.name.toLowerCase().includes(searchLower) ||
        clientSupplier?.name.toLowerCase().includes(searchLower) ||
        m.unit.toLowerCase().includes(searchLower)
      );
    });
  }, [materials, clients, searchTerm]);

  const orders = useMemo(() => {
    return (ordersRaw || []).map((r: any) => ({
      id: r.id,
      clientId: r.client_id ?? r.clientId,
      orderDate: r.order_date ?? r.created_at ?? r.orderDate ?? r.createdAt,
      createdAt: r.created_at ?? r.createdAt,
      status: r.status,
      items: (r.order_items ?? []).map((it: any) => ({
        id: it.id,
        productId: it.product_id ?? it.productId,
        quantity: Number(it.quantity ?? 0),
        unit: it.unit,
        unitPrice: Number(it.unit_price ?? it.unitPrice ?? 0),
        totalItemPrice: Number(it.total_item_price ?? it.totalItemPrice ?? (Number(it.quantity ?? 0) * Number(it.unit_price ?? it.unitPrice ?? 0))),
      }))
    }));
  }, [ordersRaw]);

  const materialHistory = useMemo(() => {
    if (!historyMaterial) return [];
    const materialId = historyMaterial.id;
    const entries: any[] = [];

    orders.forEach((order: any) => {
      const client = clients?.find(c => c.id === order.clientId);
      const isSupplier = client?.type === 'FOURNISSEUR';

      if (isSupplier) {
        (order.items || []).forEach((item: any) => {
          if (item.productId === materialId) {
            entries.push({
              id: `purchase-${order.id}-${item.id}`,
              date: order.orderDate ?? order.createdAt,
              kind: 'PURCHASE',
              label: client?.name || 'Fournisseur',
              quantity: Number(item.quantity ?? 0),
              unit: item.unit || historyMaterial.unit,
              amount: Number(item.totalItemPrice ?? (item.unitPrice ?? 0) * (item.quantity ?? 0)),
              orderId: order.id,
              direction: 'IN',
            });
          }
        });
      } else {
        (order.items || []).forEach((item: any) => {
          const product: any = (products || []).find((p: any) => p.id === item.productId);
          const formula = product?.consumptionFormula ?? [];
          const f = formula.find((x: any) => x.materialId === materialId);
          if (!f) return;
          const requiredQty = Number(f.quantity ?? 0) * Number(item.quantity ?? 0);
          if (requiredQty <= 0) return;
          entries.push({
            id: `consumption-${order.id}-${item.id}-${materialId}`,
            date: order.orderDate ?? order.createdAt,
            kind: 'CONSUMPTION',
            label: `${product?.name || 'Produit'} • ${client?.name || 'Client'}`,
            quantity: requiredQty,
            unit: historyMaterial.unit,
            amount: requiredQty * Number(historyMaterial.pricePerUnit ?? 0),
            orderId: order.id,
            direction: 'OUT',
          });
        });
      }
    });

    (transactions || []).forEach((t: any) => {
      const materialRef = t.material_id ?? t.materialId;
      if (materialRef !== materialId) return;
      entries.push({
        id: `transaction-${t.id}`,
        date: t.date ?? t.created_at ?? t.createdAt,
        kind: 'TRANSACTION',
        label: t.description || 'Transaction',
        quantity: null,
        unit: historyMaterial.unit,
        amount: Number(t.amount ?? 0),
        orderId: t.order_id ?? null,
        direction: t.type === TransactionType.INCOME ? 'IN' : 'OUT',
      });
    });

    return entries.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [historyMaterial, orders, products, clients, transactions]);

  const historyStats = useMemo(() => {
    const totals = { inQty: 0, outQty: 0, inAmount: 0, outAmount: 0, count: materialHistory.length };
    materialHistory.forEach((e: any) => {
      if (e.direction === 'IN') {
        totals.inQty += Number(e.quantity ?? 0);
        totals.inAmount += Number(e.amount ?? 0);
      } else if (e.direction === 'OUT') {
        totals.outQty += Number(e.quantity ?? 0);
        totals.outAmount += Number(e.amount ?? 0);
      }
    });
    return totals;
  }, [materialHistory]);

  return (
    <div className="bg-[#F8F9FC] min-h-screen font-sans">
      <div className="bg-white border-b border-slate-200 px-6 md:px-10 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900">Matières Premières</h1>
          <p className="text-sm text-slate-500 mt-2">Gestion du stock (Fourni par vos clients)</p>
        </div>
      </div>

      <div className="p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-6">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher par nom, client ou unité..."
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

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="h-64 bg-white border border-slate-200 animate-pulse rounded-2xl"></div>)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMaterials?.map((material) => {
                const clientSupplier = clients?.find(c => c.id === material.supplierId);
                return (
                  <div key={material.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition-all shadow-sm group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center text-indigo-600 font-bold text-lg border border-indigo-200">
                        <Layers size={20} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openFormModal(material)} className="p-2 text-yellow-600 bg-yellow-50 hover:bg-yellow-100 rounded-lg border border-yellow-200 transition-all font-semibold">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDeleteClick(material)} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-all font-semibold">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-3">{material.name}</h3>

                    <div className="space-y-2.5 mb-4 text-sm">
                      <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg text-slate-700">
                        <User size={16} className="text-blue-600 shrink-0" />
                        <span className="truncate text-xs font-medium">Fournisseur : {clientSupplier?.name || 'Non assigné'}</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-emerald-50 rounded-lg text-slate-700">
                        <Package size={16} className="text-emerald-600 shrink-0" />
                        <span className="text-xs font-medium">{material.stock} {material.unit}</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg text-slate-700">
                        <span className="text-amber-600 shrink-0 font-bold text-xs">DA</span>
                        <span className="truncate text-xs font-medium">{material.pricePerUnit} DA / {material.unit}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${material.stock < 10 ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                        <span className="text-xs font-semibold text-slate-500">
                          {material.stock < 10 ? 'Stock faible' : 'Stock OK'}
                        </span>
                      </div>
                      <button
                        onClick={() => openHistoryModal(material)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-all"
                      >
                        <Info size={12} />
                        Historique
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MODAL FORMULAIRE */}
          {isFormModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedMaterial ? 'Modifier la matière' : 'Nouvelle matière'}
                  </h3>
                  <button onClick={closeFormModal} className="p-2 hover:bg-slate-100 rounded-lg transition-all">
                    <X size={20} className="text-slate-600" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Nom de la matière</label>
                    <input
                      placeholder="ex: Cuir Noir 1.2mm"
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
                      required
                    >
                      <option value="">Sélectionner le fournisseur</option>
                      {clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Stock</label>
                      <input
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Prix unitaire (DA)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.pricePerUnit}
                      onChange={(e) => setFormData({...formData, pricePerUnit: Number(e.target.value)})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={closeFormModal} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all">
                      Annuler
                    </button>
                    <button type="submit" disabled={saveMutation.isLoading} className="flex-1 px-4 py-2.5 bg-[#6366F1] text-white rounded-xl text-sm font-semibold hover:bg-[#5558E3] transition-all">
                      {saveMutation.isLoading ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL SUPPRESSION */}
          {isDeleteModalOpen && selectedMaterial && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-center">
                <div className="mx-auto w-14 h-14 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4">
                  <AlertTriangle size={28} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Supprimer la matière ?</h3>
                <p className="text-sm text-slate-600 mb-6">
                  Vous allez supprimer <span className="font-bold">"{selectedMaterial.name}"</span>.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all">
                    Annuler
                  </button>
                  <button onClick={() => deleteMutation.mutate(selectedMaterial.id)} className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition-all">
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL HISTORIQUE */}
          {isHistoryModalOpen && historyMaterial && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
              <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl p-6 my-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Historique matière</h3>
                    <p className="text-sm text-slate-500 mt-1">{historyMaterial.name} • {historyMaterial.unit}</p>
                  </div>
                  <button onClick={closeHistoryModal} className="p-2 hover:bg-slate-100 rounded-lg transition-all">
                    <X size={20} className="text-slate-600" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Stock actuel</p>
                    <p className="text-2xl font-bold text-slate-900 mt-2">{historyMaterial.stock?.toLocaleString()} {historyMaterial.unit}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-emerald-700 uppercase">Entrées</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-2">+{historyStats.inQty.toLocaleString()} {historyMaterial.unit}</p>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-rose-700 uppercase">Sorties</p>
                    <p className="text-2xl font-bold text-rose-600 mt-2">-{historyStats.outQty.toLocaleString()} {historyMaterial.unit}</p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Détail</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600">Quantité</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600">Montant</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600">Commande</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {materialHistory.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                            Aucun historique trouvé pour cette matière.
                          </td>
                        </tr>
                      ) : (
                        materialHistory.map((e: any) => {
                          const isIn = e.direction === 'IN';
                          const badge =
                            e.kind === 'PURCHASE'
                              ? { label: 'Achat', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <ArrowUpCircle size={14} /> }
                              : e.kind === 'CONSUMPTION'
                                ? { label: 'Consommation', classes: 'bg-rose-100 text-rose-700 border-rose-200', icon: <ArrowDownCircle size={14} /> }
                                : { label: 'Transaction', classes: 'bg-slate-100 text-slate-700 border-slate-200', icon: <Truck size={14} /> };

                          return (
                            <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-slate-700">
                                {e.date ? new Date(e.date).toLocaleDateString('fr-FR') : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border ${badge.classes}`}>
                                  {badge.icon}
                                  {badge.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                <div className="font-medium text-slate-900">{e.label}</div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {e.quantity !== null && e.quantity !== undefined ? (
                                  <span className={`font-semibold ${isIn ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {isIn ? '+' : '-'}{Number(e.quantity).toLocaleString()} {e.unit}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {e.amount !== null && e.amount !== undefined ? (
                                  <span className="font-semibold text-slate-900">{Number(e.amount).toLocaleString()} DA</span>
                                ) : (
                                  <span className="text-xs text-slate-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {e.orderId ? (
                                  <Link to={`/orders/${e.orderId}`} className="text-indigo-600 hover:underline text-xs font-semibold">
                                    CMD-{String(e.orderId).slice(0,8).toUpperCase()}
                                  </Link>
                                ) : (
                                  <span className="text-xs text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-3 pt-6">
                  <button onClick={closeHistoryModal} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all">
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
