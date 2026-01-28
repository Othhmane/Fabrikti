import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FabriktiService } from '../../api/services';
import { Card, Button, Input, Badge } from '../../components/UI';
import { Settings, Plus, Calendar, AlertCircle, Wrench, X, History, DollarSign, Edit, Trash2, Search } from 'lucide-react';
import { Machine, Intervention } from '../../types';

export const MachineList: React.FC = () => {
  const queryClient = useQueryClient();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [editingMachine, setEditingMachine] = useState<Partial<Machine> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: machines, isLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: FabriktiService.getMachines
  });

  const saveMutation = useMutation({
    mutationFn: FabriktiService.saveMachine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      setIsFormModalOpen(false);
      setIsInterventionModalOpen(false);
      setEditingMachine(null);
    }
  });

  const addIntervention = (machineId: string, intervention: Partial<Intervention>) => {
    const machine = machines?.find(m => m.id === machineId);
    if (!machine) return;
    const newIntervention: Intervention = {
      id: Math.random().toString(36).substr(2, 9),
      date: intervention.date || new Date().toISOString(),
      description: intervention.description || '',
      cost: intervention.cost || 0
    };
    const updatedMachine = {
      ...machine,
      interventions: [...(machine.interventions || []), newIntervention],
      lastMaintenance: newIntervention.date
    };
    saveMutation.mutate(updatedMachine);
  };

  const openFormModal = (machine: Machine | null = null) => {
    setEditingMachine(machine);
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingMachine(null);
  };

  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'operational': return { label: 'Opérationnel', color: 'emerald' };
      case 'maintenance': return { label: 'Maintenance', color: 'amber' };
      default: return { label: 'En panne', color: 'rose' };
    }
  };

  const filteredMachines = machines?.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-[#F8F9FC] min-h-screen font-sans">
      {/* HEADER TITLE */}
      <div className="bg-white border-b border-slate-200 px-6 md:px-10 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900">Parc Machines</h1>
          <p className="text-sm text-slate-500 mt-2">Suivi technique et maintenance du matériel</p>
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
                placeholder="Rechercher une machine..."
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
              Nouvelle Machine
            </button>
          </div>

          {/* MACHINES GRID */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="h-64 bg-white border border-slate-200 animate-pulse rounded-2xl"></div>)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMachines?.map((machine) => {
                const statusInfo = getStatusInfo(machine.status);
                return (
                  <div key={machine.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition-all shadow-sm group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center text-indigo-600 font-bold text-lg border border-indigo-200">
                        <Settings size={20} />
                      </div>
                      <div className="flex gap-2 transition-opacity">
                        <button
                          onClick={() => openFormModal(machine)}
                          className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all font-semibold"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => { setSelectedMachine(machine); setIsInterventionModalOpen(true); }}
                          className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all font-semibold"
                          title="Intervenir"
                        >
                          <Wrench size={16} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-3">{machine.name}</h3>

                    <div className="space-y-2.5 mb-4 text-sm">
                      <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg text-slate-700">
                        <Calendar size={16} className="text-blue-600 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 font-semibold">Dernière maintenance</p>
                          <p className="text-xs font-medium text-slate-900">{new Date(machine.lastMaintenance).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-emerald-50 rounded-lg text-slate-700">
                        <History size={16} className="text-emerald-600 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-emerald-600 font-semibold">Interventions</p>
                          <p className="text-xs font-medium text-slate-900">{machine.interventions?.length || 0} opérations</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg text-slate-700">
                        <AlertCircle size={16} className="text-amber-600 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-amber-600 font-semibold">Statut</p>
                          <p className="text-xs font-medium text-slate-900">{statusInfo.label}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full bg-${statusInfo.color}-500`}></div>
                        <span className="text-xs font-semibold text-slate-500">{statusInfo.label}</span>
                      </div>
                      <button
                        onClick={() => { setSelectedMachine(machine); setIsInterventionModalOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-all"
                      >
                        <Wrench size={12} />
                        Intervenir
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredMachines?.length === 0 && (
                <div className="col-span-full py-16 text-center bg-white border border-slate-200 rounded-2xl">
                  <Settings size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-semibold">Aucune machine trouvée</p>
                  <p className="text-slate-400 text-sm mt-1">Essayez un autre terme de recherche</p>
                </div>
              )}
            </div>
          )}

          {/* MODAL FORMULAIRE MACHINE */}
          {isFormModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {editingMachine ? 'Modifier la machine' : 'Nouvelle machine'}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Informations de la machine</p>
                  </div>
                  <button onClick={closeFormModal} className="p-2 hover:bg-slate-100 rounded-lg transition-all">
                    <X size={20} className="text-slate-600" />
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  saveMutation.mutate({
                    id: editingMachine?.id,
                    name: formData.get('name') as string,
                    status: formData.get('status') as any,
                    lastMaintenance: formData.get('lastMaintenance') as string,
                    interventions: editingMachine?.interventions || []
                  });
                }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Nom de la machine</label>
                    <input
                      name="name"
                      placeholder="ex: Presse hydraulique 3000T"
                      defaultValue={editingMachine?.name}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Statut actuel</label>
                      <select
                        name="status"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        defaultValue={editingMachine?.status || 'operational'}
                      >
                        <option value="operational">Opérationnel</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="broken">En panne</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Date d'acquisition</label>
                      <input
                        name="lastMaintenance"
                        type="date"
                        defaultValue={editingMachine?.lastMaintenance}
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
                      {saveMutation.isPending ? 'Enregistrement...' : (editingMachine ? 'Mettre à jour' : 'Enregistrer')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL INTERVENTION */}
          {isInterventionModalOpen && selectedMachine && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Intervention</h3>
                    <p className="text-sm text-slate-500 mt-1">{selectedMachine.name}</p>
                  </div>
                  <button onClick={() => setIsInterventionModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-all">
                    <X size={20} className="text-slate-600" />
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  addIntervention(selectedMachine.id, {
                    date: formData.get('date') as string,
                    description: formData.get('description') as string,
                    cost: Number(formData.get('cost'))
                  });
                  
                  // Mise à jour automatique du statut si spécifié
                  const newStatus = formData.get('newStatus') as any;
                  if (newStatus && newStatus !== selectedMachine.status) {
                    saveMutation.mutate({
                      ...selectedMachine,
                      status: newStatus
                    });
                  }
                  
                  e.currentTarget.reset();
                }} className="p-4 bg-indigo-50 rounded-xl mb-6 space-y-4 border border-indigo-200">
                  <p className="font-bold text-sm text-indigo-600 uppercase tracking-wider">Nouvelle opération</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      name="date"
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      required
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <input
                      name="cost"
                      type="number"
                      placeholder="Coût (DA)"
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <input
                    name="description"
                    placeholder="Description des travaux..."
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase ml-1">Mettre à jour le statut</label>
                    <select 
                      name="newStatus" 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      defaultValue={selectedMachine.status}
                    >
                      <option value="operational">Opérationnel</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="broken">En panne</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="w-full px-4 py-2.5 bg-[#6366F1] text-white rounded-lg text-sm font-semibold hover:bg-[#5558E3] transition-all disabled:opacity-50"
                  >
                    {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer l\'opération'}
                  </button>
                </form>

                <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Historique des travaux</h4>
                  {selectedMachine.interventions?.length === 0 ? (
                    <p className="text-center py-6 text-slate-400 italic text-sm">Aucune intervention passée.</p>
                  ) : selectedMachine.interventions?.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(inv => (
                    <div key={inv.id} className="p-3 border border-slate-200 rounded-lg bg-white flex justify-between items-start hover:border-indigo-200 transition-all">
                      <div>
                        <p className="text-xs font-bold text-slate-400">{new Date(inv.date).toLocaleDateString()}</p>
                        <p className="text-sm font-medium text-slate-900 mt-1">{inv.description}</p>
                      </div>
                      {inv.cost ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                          {inv.cost} DA
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
