import React, { useEffect, useState } from 'react';
import { ArrowUpCircle, Plus, Search, Calendar, Filter, Download, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { useSettingsStore } from '../store/settingsStore';

export default function Inflows() {
  const { erpSettings, fetchSettings } = useSettingsStore();
  const currencySymbol = erpSettings?.currencySymbol || '₹';
  const [inflows, setInflows] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [boqs, setBoqs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newInflow, setNewInflow] = useState({ 
    clientId: '', 
    boqId: '', 
    projectId: '',
    amount: '', 
    description: '', 
    method: 'Bank Transfer',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      const [cfRes, clientRes, boqRes, projectRes] = await Promise.all([
        fetch('/api/cash-flow'),
        fetch('/api/clients'),
        fetch('/api/boqs'),
        fetch('/api/projects')
      ]);
      if (cfRes.ok && clientRes.ok && boqRes.ok && projectRes.ok) {
        const cfData = await cfRes.json();
        const clientsData = await clientRes.json();
        const boqsData = await boqRes.json();
        const projectsData = await projectRes.json();

        setInflows(Array.isArray(cfData.inflows) ? cfData.inflows : []);
        setClients(Array.isArray(clientsData) ? clientsData : []);
        setBoqs(Array.isArray(boqsData) ? boqsData : []);
        setProjects(Array.isArray(projectsData) ? projectsData : []);
      }
    } catch (e) {
      console.error("Failed to fetch data", e);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/inflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newInflow),
    });
    if (res.ok) {
      setIsModalOpen(false);
      setNewInflow({ 
        clientId: '', 
        boqId: '', 
        projectId: '',
        amount: '', 
        description: '', 
        method: 'Bank Transfer',
        date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    }
  };

  const filteredInflows = inflows.filter(i => {
    const clientName = i.client?.name || 'Unknown Client';
    return clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
           i.description?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalInflow = filteredInflows.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Inflows & Client Payments</h1>
          <p className="text-slate-400 mt-1">Track all payments received from clients for various projects.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Plus size={20} />
            Record Inflow
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <ArrowUpCircle size={20} />
            </div>
            <span className="text-sm font-medium text-slate-400">Total Inflow (Filtered)</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(totalInflow, currencySymbol)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
              <Calendar size={20} />
            </div>
            <span className="text-sm font-medium text-slate-400">Transaction Count</span>
          </div>
          <div className="text-2xl font-bold text-white">{filteredInflows.length}</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search by client or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition-colors">
              <Download size={20} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider font-bold">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Client / Project</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredInflows.map((inflow) => (
                <tr key={inflow.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 text-sm text-slate-400">{formatDate(inflow.date)}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{inflow.client?.name || 'Unknown'}</div>
                    <div className="text-xs text-slate-500">
                      {inflow.project?.name ? `Project: ${inflow.project.name}` : (inflow.boq ? `BOQ: ${inflow.boq.name}` : inflow.description)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{inflow.method}</td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-400">
                    {formatCurrency(inflow.amount, currencySymbol)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredInflows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No inflows found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Record Client Payment</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Date</label>
                <input
                  type="date"
                  value={newInflow.date || ''}
                  onChange={(e) => setNewInflow({ ...newInflow, date: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Select Client</label>
                <select
                  value={newInflow.clientId || ''}
                  onChange={(e) => setNewInflow({ ...newInflow, clientId: e.target.value, projectId: '', boqId: '' })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select a client...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              {newInflow.clientId && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Select Project</label>
                    <select
                      value={newInflow.projectId || ''}
                      onChange={(e) => setNewInflow({ ...newInflow, projectId: e.target.value, boqId: '' })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">General (No specific project)</option>
                      {projects.filter(p => p.clientId === newInflow.clientId).map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Select BOQ (Optional)</label>
                    <select
                      value={newInflow.boqId || ''}
                      onChange={(e) => setNewInflow({ ...newInflow, boqId: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">General (No specific BOQ)</option>
                      {boqs.filter(b => {
                        if (newInflow.projectId) return b.projectId === newInflow.projectId;
                        return b.clientId === newInflow.clientId;
                      }).map((boq: any) => (
                        <option key={boq.id} value={boq.id}>{boq.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Amount ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  value={newInflow.amount || ''}
                  onChange={(e) => setNewInflow({ ...newInflow, amount: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Payment Method</label>
                <select
                  value={newInflow.method || 'Bank Transfer'}
                  onChange={(e) => setNewInflow({ ...newInflow, method: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <input
                  type="text"
                  value={newInflow.description || ''}
                  onChange={(e) => setNewInflow({ ...newInflow, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Advance for Project X"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg shadow-lg shadow-emerald-500/20 transition-colors"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
