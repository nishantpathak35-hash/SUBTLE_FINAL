import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageTransition } from '../components/ui/PageTransition';
import { toast } from 'sonner';
import { ArrowUpCircle, ArrowDownCircle, Plus, Search, Calendar, CreditCard, Building2, User, Wallet, TrendingUp, TrendingDown, LayoutGrid, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { useSettingsStore } from '../store/settingsStore';

export default function CashFlow() {
  const { erpSettings, fetchSettings } = useSettingsStore();
  const currencySymbol = erpSettings?.currencySymbol || '₹';
  const [data, setData] = useState<{ inflows: any[], vendorPayments: any[], generalOutflows: any[] }>({ 
    inflows: [], 
    vendorPayments: [], 
    generalOutflows: [] 
  });
  const [clients, setClients] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [isInflowModalOpen, setIsInflowModalOpen] = useState(false);
  const [isOutflowModalOpen, setIsOutflowModalOpen] = useState(false);
  const [newInflow, setNewInflow] = useState({ clientId: '', boqId: '', amount: '', description: '', method: 'Bank Transfer' });
  const [newOutflow, setNewOutflow] = useState({ vendorId: '', amount: '', description: '', method: 'Bank Transfer', category: 'General' });

  const [isSubmittingInflow, setIsSubmittingInflow] = useState(false);
  const [isSubmittingOutflow, setIsSubmittingOutflow] = useState(false);

  const fetchData = async () => {
    try {
      const [cfRes, clientRes, vendorRes] = await Promise.all([
        fetch('/api/cash-flow'),
        fetch('/api/clients'),
        fetch('/api/vendors')
      ]);
      
      if (cfRes.ok) {
        const cfData = await cfRes.json();
        if (cfData && typeof cfData === 'object') {
          setData({
            inflows: Array.isArray(cfData.inflows) ? cfData.inflows : [],
            vendorPayments: Array.isArray(cfData.vendorPayments) ? cfData.vendorPayments : [],
            generalOutflows: Array.isArray(cfData.generalOutflows) ? cfData.generalOutflows : []
          });
        }
      }
      
      if (clientRes.ok) {
        const clientData = await clientRes.json();
        if (Array.isArray(clientData)) {
          setClients(clientData);
        } else {
          setClients([]);
        }
      }
      
      if (vendorRes.ok) {
        const vendorData = await vendorRes.json();
        if (Array.isArray(vendorData)) {
          setVendors(vendorData);
        } else {
          setVendors([]);
        }
      }
    } catch (e) {
      console.error("Failed to fetch cash flow data", e);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchData();
  }, []);

  const handleInflowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingInflow) return;
    
    if (!newInflow.clientId || !newInflow.amount) {
      toast.error('Please fill required fields');
      return;
    }

    setIsSubmittingInflow(true);
    try {
      const res = await fetch('/api/inflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInflow),
      });
      if (res.ok) {
        toast.success('Inflow recorded successfully');
        setIsInflowModalOpen(false);
        setNewInflow({ clientId: '', boqId: '', amount: '', description: '', method: 'Bank Transfer' });
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to record inflow');
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmittingInflow(false);
    }
  };

  const handleOutflowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingOutflow) return;

    if (!newOutflow.amount) {
      toast.error('Please enter an amount');
      return;
    }

    setIsSubmittingOutflow(true);
    try {
      const res = await fetch('/api/outflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOutflow),
      });
      if (res.ok) {
        toast.success('Outflow recorded successfully');
        setIsOutflowModalOpen(false);
        setNewOutflow({ vendorId: '', amount: '', description: '', method: 'Bank Transfer', category: 'General' });
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to record outflow');
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmittingOutflow(false);
    }
  };

  const totalInflow = data.inflows.reduce((sum, i) => sum + i.amount, 0);
  const totalVendorPayments = data.vendorPayments.reduce((sum, o) => sum + o.amount, 0);
  const totalGeneralOutflows = data.generalOutflows.reduce((sum, o) => sum + o.amount, 0);
  const totalOutflow = totalVendorPayments + totalGeneralOutflows;
  const balance = totalInflow - totalOutflow;

  // Combine and sort outflows by date
  const allOutflows = [
    ...data.vendorPayments.map(p => ({
      id: p.id,
      date: p.date,
      amount: p.amount,
      title: p.vendor?.name || 'Unknown Vendor',
      subtitle: `PO: ${p.purchaseOrder?.poNumber || p.poId || 'N/A'}`,
      type: 'Vendor Payment'
    })),
    ...data.generalOutflows.map(o => ({
      id: o.id,
      date: o.date,
      amount: o.amount,
      title: o.vendor?.name || 'General Expense',
      subtitle: o.description || 'General outflow',
      type: o.category || 'General'
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <PageTransition>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Cash Flow</h1>
          <p className="text-slate-400 mt-1">Track inflows from clients and outflows to vendors.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsOutflowModalOpen(true)}
            className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-lg shadow-rose-500/20"
          >
            <Plus size={20} />
            Record Outflow
          </button>
          <button
            onClick={() => setIsInflowModalOpen(true)}
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
            <span className="text-sm font-medium text-slate-400">Total Inflow</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(totalInflow, currencySymbol)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
              <ArrowDownCircle size={20} />
            </div>
            <span className="text-sm font-medium text-slate-400">Total Outflow</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(totalOutflow, currencySymbol)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <CreditCard size={20} />
            </div>
            <span className="text-sm font-medium text-slate-400">Net Balance</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(balance, currencySymbol)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inflows Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ArrowUpCircle size={20} className="text-emerald-400" />
              Recent Inflows (Client Payments)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider font-bold">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.inflows.map((inflow) => (
                  <tr key={inflow.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-400">{formatDate(inflow.date)}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{inflow.client.name}</div>
                      <div className="text-xs text-slate-500">{inflow.description}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-400">
                      {formatCurrency(inflow.amount, currencySymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Outflows Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ArrowDownCircle size={20} className="text-rose-400" />
              Recent Outflows
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider font-bold">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Details</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {allOutflows.map((outflow) => (
                  <tr key={outflow.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-400">{formatDate(outflow.date)}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{outflow.title}</div>
                      <div className="text-xs text-slate-500">{outflow.subtitle}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        {outflow.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-rose-400">
                      {formatCurrency(outflow.amount, currencySymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isInflowModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">Record Client Payment</h2>
            </div>
            <form onSubmit={handleInflowSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Select Client</label>
                <select
                  value={newInflow.clientId}
                  onChange={(e) => {
                    setNewInflow({ ...newInflow, clientId: e.target.value, boqId: '' });
                  }}
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
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Select Project (BOQ)</label>
                  <select
                    value={newInflow.boqId}
                    onChange={(e) => setNewInflow({ ...newInflow, boqId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">General Payment (No specific project)</option>
                    {clients.find(c => c.id === newInflow.clientId)?.boqs.map((boq: any) => (
                      <option key={boq.id} value={boq.id}>{boq.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Amount ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  value={newInflow.amount}
                  onChange={(e) => setNewInflow({ ...newInflow, amount: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Payment Method</label>
                <select
                  value={newInflow.method}
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
                  value={newInflow.description}
                  onChange={(e) => setNewInflow({ ...newInflow, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Advance for Project X"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInflowModalOpen(false)}
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

      {isOutflowModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">Record Outflow / Expense</h2>
            </div>
            <form onSubmit={handleOutflowSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Select Vendor (Optional)</label>
                <select
                  value={newOutflow.vendorId}
                  onChange={(e) => setNewOutflow({ ...newOutflow, vendorId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">General Expense (No specific vendor)</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                <select
                  value={newOutflow.category}
                  onChange={(e) => setNewOutflow({ ...newOutflow, category: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="General">General</option>
                  <option value="Vendor Payment">Vendor Payment</option>
                  <option value="Salaries">Salaries</option>
                  <option value="Office Rent">Office Rent</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Taxes">Taxes</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Amount ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  value={newOutflow.amount}
                  onChange={(e) => setNewOutflow({ ...newOutflow, amount: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Payment Method</label>
                <select
                  value={newOutflow.method}
                  onChange={(e) => setNewOutflow({ ...newOutflow, method: e.target.value })}
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
                  value={newOutflow.description}
                  onChange={(e) => setNewOutflow({ ...newOutflow, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Office supplies"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOutflowModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-medium py-2 rounded-lg shadow-lg shadow-rose-500/20 transition-colors"
                >
                  Record Outflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </PageTransition>
  );
}
