import React, { useEffect, useState } from 'react';
import { ArrowDownCircle, Plus, Search, Calendar, Filter, Download, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { useSettingsStore } from '../store/settingsStore';

export default function Outflows() {
  const { erpSettings, fetchSettings } = useSettingsStore();
  const currencySymbol = erpSettings?.currencySymbol || '₹';
  const [outflows, setOutflows] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [newOutflow, setNewOutflow] = useState({ 
    vendorId: '', 
    poId: '',
    boqId: '',
    projectId: '',
    amount: '', 
    description: '', 
    method: 'Bank Transfer', 
    category: 'General',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      const [cfRes, vendorRes, poRes, projectRes] = await Promise.all([
        fetch('/api/cash-flow'),
        fetch('/api/vendors'),
        fetch('/api/pts'),
        fetch('/api/projects')
      ]);
      if (cfRes.ok && vendorRes.ok && poRes.ok && projectRes.ok) {
        const cfData = await cfRes.json();
        const pos = await poRes.json();
        const projs = await projectRes.json();
        const vendorsData = await vendorRes.json();
        
        setPurchaseOrders(Array.isArray(pos) ? pos : []);
        setProjects(Array.isArray(projs) ? projs : []);
        setVendors(Array.isArray(vendorsData) ? vendorsData : []);

        if (cfData && Array.isArray(cfData.generalOutflows)) {
          const mapped = cfData.generalOutflows.map((o: any) => ({
            id: o.id,
            date: o.date,
            amount: o.amount,
            title: o.vendor?.name || o.purchaseOrder?.vendor?.name || 'General Expense',
            subtitle: o.purchaseOrder 
              ? `PO: ${o.purchaseOrder.poNumber}${o.project?.name ? ` | Project: ${o.project.name}` : (o.boq?.project?.name ? ` | Project: ${o.boq.project.name}` : (o.boq ? ` | BOQ: ${o.boq.name}` : ''))}`
              : o.project?.name ? `Project: ${o.project.name}` : (o.boq?.project?.name ? `Project: ${o.boq.project.name}` : (o.boq ? `BOQ: ${o.boq.name}` : o.description)),
            type: o.category,
            method: o.method || 'N/A',
            isVendorPayment: !!o.vendorId || !!o.poId
          })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          setOutflows(mapped);
        } else {
          setOutflows([]);
        }
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
    const res = await fetch('/api/outflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOutflow),
    });
    if (res.ok) {
      setIsModalOpen(false);
      setNewOutflow({ 
        vendorId: '', 
        poId: '',
        boqId: '',
        projectId: '',
        amount: '', 
        description: '', 
        method: 'Bank Transfer', 
        category: 'General',
        date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    }
  };

  const filteredOutflows = outflows.filter(o => {
    const matchesSearch = o.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         o.subtitle?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || o.type === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalOutflow = filteredOutflows.reduce((sum, o) => sum + o.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Outflows & Expenses</h1>
          <p className="text-slate-400 mt-1">Manage all payments to vendors and general business expenses.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-lg shadow-rose-500/20"
          >
            <Plus size={20} />
            Record Outflow
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
              <ArrowDownCircle size={20} />
            </div>
            <span className="text-sm font-medium text-slate-400">Total Outflow (Filtered)</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(totalOutflow, currencySymbol)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Filter size={20} />
            </div>
            <span className="text-sm font-medium text-slate-400">Active Filters</span>
          </div>
          <div className="text-lg font-medium text-white">{filterCategory}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
              <Calendar size={20} />
            </div>
            <span className="text-sm font-medium text-slate-400">Transaction Count</span>
          </div>
          <div className="text-2xl font-bold text-white">{filteredOutflows.length}</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search by vendor or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Categories</option>
              <option value="Vendor Payment">Vendor Payments</option>
              <option value="General">General</option>
              <option value="Salaries">Salaries</option>
              <option value="Office Rent">Office Rent</option>
              <option value="Utilities">Utilities</option>
              <option value="Taxes">Taxes</option>
              <option value="Other">Other</option>
            </select>
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
                <th className="px-6 py-4">Vendor / Description</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredOutflows.map((outflow) => (
                <tr key={outflow.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 text-sm text-slate-400">{formatDate(outflow.date)}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{outflow.title}</div>
                    <div className="text-xs text-slate-500">{outflow.subtitle}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                      outflow.type === 'Vendor Payment' 
                        ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    )}>
                      {outflow.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{outflow.method}</td>
                  <td className="px-6 py-4 text-right font-bold text-rose-400">
                    {formatCurrency(outflow.amount, currencySymbol)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredOutflows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No outflows found matching your criteria.
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
              <h2 className="text-xl font-bold text-white">Record Outflow / Expense</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Date</label>
                <input
                  type="date"
                  value={newOutflow.date || ''}
                  onChange={(e) => setNewOutflow({ ...newOutflow, date: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Select Vendor (Optional)</label>
                <select
                  value={newOutflow.vendorId || ''}
                  onChange={(e) => {
                    const vId = e.target.value;
                    setNewOutflow({ ...newOutflow, vendorId: vId, poId: '' });
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">General Expense (No specific vendor)</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                  ))}
                </select>
              </div>
              {newOutflow.vendorId && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Select Purchase Order (Optional)</label>
                  <select
                    value={newOutflow.poId || ''}
                    onChange={(e) => {
                      const poId = e.target.value;
                      const selectedPO = purchaseOrders.find(po => po.id === poId);
                      setNewOutflow({ 
                        ...newOutflow, 
                        poId,
                        projectId: selectedPO?.projectId || '',
                        boqId: selectedPO?.boqId || ''
                      });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">No specific PO</option>
                    {purchaseOrders
                      .filter(po => po.vendorId === newOutflow.vendorId)
                      .map(po => (
                        <option key={po.id} value={po.id}>{po.poNumber} ({formatCurrency(po.totalAmount, currencySymbol)})</option>
                      ))
                    }
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Map to Project (Optional)</label>
                <select
                  value={newOutflow.projectId || ''}
                  onChange={(e) => setNewOutflow({ ...newOutflow, projectId: e.target.value, boqId: '' })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">General Expense (No specific project)</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Map to BOQ (Optional)</label>
                <select
                  value={newOutflow.boqId || ''}
                  onChange={(e) => setNewOutflow({ ...newOutflow, boqId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">General Expense (No specific BOQ)</option>
                  {projects.map(project => (
                    <optgroup key={project.id} label={project.name}>
                      {project.boqs.filter((b: any) => !newOutflow.projectId || b.projectId === newOutflow.projectId).map((boq: any) => (
                        <option key={boq.id} value={boq.id}>{boq.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                <select
                  value={newOutflow.category || 'General'}
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
                  value={newOutflow.amount || ''}
                  onChange={(e) => setNewOutflow({ ...newOutflow, amount: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Payment Method</label>
                <select
                  value={newOutflow.method || 'Bank Transfer'}
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
                  value={newOutflow.description || ''}
                  onChange={(e) => setNewOutflow({ ...newOutflow, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Office supplies"
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
  );
}
