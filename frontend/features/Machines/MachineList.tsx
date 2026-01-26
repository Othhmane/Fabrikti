
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FabriktiService } from '../../api/services';
import { Card, Button, Input, Badge } from '../../components/UI';
import { Settings, Plus, Calendar, AlertCircle, Wrench, X, History, DollarSign } from 'lucide-react';
import { Machine, Intervention } from '../../types';

export const MachineList: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [editingMachine, setEditingMachine] = useState<Partial<Machine> | null>(null);

  const { data: machines, isLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: FabriktiService.getMachines
  });

  const saveMutation = useMutation({
    mutationFn: FabriktiService.saveMachine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      setIsModalOpen(false);
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

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'operational': return <Badge color="green">Opérationnel</Badge>;
      case 'maintenance': return <Badge color="yellow">Maintenance</Badge>;
      default: return <Badge color="red">En panne</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Parc Machines</h2>
          <p className="text-gray-500">Suivi technique et maintenance du matériel.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Ajouter une Machine
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [1,2].map(i => <div key={i} className="h-48 bg-gray-200 animate-pulse rounded-xl"></div>)
        ) : machines?.map(m => (
          <Card key={m.id} className="p-6 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-gray-100 rounded-xl text-gray-600">
                <Settings size={24} />
              </div>
              {getStatusBadge(m.status)}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{m.name}</h3>
            
            <div className="space-y-2 text-sm text-gray-500 mb-4">
              <div className="flex items-center gap-2">
                <Calendar size={14} /> Dernier : {m.lastMaintenance}
              </div>
              <div className="flex items-center gap-2">
                <History size={14} /> {m.interventions?.length || 0} interventions
              </div>
            </div>

            <div className="mt-auto pt-4 flex gap-2 border-t">
              <Button variant="secondary" className="flex-1 text-xs" onClick={() => { setSelectedMachine(m); setIsInterventionModalOpen(true); }}>
                <Wrench size={14} /> Intervenir
              </Button>
              <Button variant="ghost" className="p-2" onClick={() => { setEditingMachine(m); setIsModalOpen(true); }}>
                <Settings size={16} />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* MODAL AJOUT/EDIT MACHINE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold">{editingMachine ? 'Modifier' : 'Nouvelle'} Machine</h3>
               <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-400"/></button>
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
              <Input name="name" label="Nom de la machine" defaultValue={editingMachine?.name} required />
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Statut actuel</label>
                <select name="status" className="w-full border p-2 rounded-lg" defaultValue={editingMachine?.status || 'operational'}>
                  <option value="operational">Opérationnel</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="broken">En panne</option>
                </select>
              </div>
              <Input name="lastMaintenance" label="Date d'acquisition" type="date" defaultValue={editingMachine?.lastMaintenance} />
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                <Button type="submit" className="flex-1" isLoading={saveMutation.isPending}>Enregistrer</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL INTERVENTION */}
      {isInterventionModalOpen && selectedMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold">Intervention : {selectedMachine.name}</h3>
               <button onClick={() => setIsInterventionModalOpen(false)}><X size={24} className="text-gray-400"/></button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              addIntervention(selectedMachine.id, {
                date: formData.get('date') as string,
                description: formData.get('description') as string,
                cost: Number(formData.get('cost'))
              });
            }} className="p-4 bg-gray-50 rounded-xl mb-6 space-y-4 border border-blue-100">
              <p className="font-bold text-sm text-blue-600">Nouvelle opération</p>
              <div className="grid grid-cols-2 gap-3">
                <Input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                <Input name="cost" type="number" placeholder="Coût (€)" icon={<DollarSign size={14}/>} />
              </div>
              <Input name="description" placeholder="Description des travaux..." required />
              <Button type="submit" className="w-full" isLoading={saveMutation.isPending}>Enregistrer l'opération</Button>
            </form>

            <div className="space-y-3">
              <h4 className="font-bold text-sm uppercase text-gray-400">Historique des travaux</h4>
              {selectedMachine.interventions?.length === 0 ? (
                <p className="text-center py-6 text-gray-400 italic">Aucune intervention passée.</p>
              ) : selectedMachine.interventions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(inv => (
                <div key={inv.id} className="p-3 border rounded-lg bg-white flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-gray-400">{new Date(inv.date).toLocaleDateString()}</p>
                    <p className="text-sm font-medium">{inv.description}</p>
                  </div>
                  {inv.cost ? <Badge color="blue">{inv.cost} €</Badge> : null}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
