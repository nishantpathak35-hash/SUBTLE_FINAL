import React, { useEffect, useState } from 'react';
import { Plus, Search, FileText, Download, Filter, ChevronRight, AlertCircle, Building2, Package, Calendar, User, Hash, CheckCircle2, CreditCard, ArrowDownCircle, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';
import { toast } from 'sonner';
import { generatePOPDF } from '../lib/pdfGenerator';
import { useSettingsStore } from '../store/settingsStore';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  boqId?: string;
  projectId?: string;
  vendorId: string;
  status: string;
  subTotal: number;
  gstAmount: number;
  totalAmount: number;
  terms?: string;
  createdAt: string;
  vendor: {
    id: string;
    name: string;
    email: string;
    address?: string;
    gstNumber?: string;
  };
  boq?: {
    id: string;
    name: string;
    project?: {
      id: string;
      name: string;
    };
  };
  project?: {
    id: string;
    name: string;
  };
  items: any[];
  outflows?: any[];
  invoices?: any[];
}

export default function PurchaseOrders() {
  const { erpSettings, fetchSettings } = useSettingsStore();
  const currencySymbol = erpSettings?.currencySymbol || '₹';
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [boqs, setBoqs] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [itemMaster, setItemMaster] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPO, setNewPO] = useState({
    boqId: '',
    projectId: '',
    vendorId: '',
    terms: '',
    status: 'Draft',
    items: [{ itemId: '', description: '', quantity: '1', unit: 'Nos', rate: '0', gstRate: '18' }]
  });

  useEffect(() => {
    if (isModalOpen && settings?.poTerms && !newPO.terms) {
      setNewPO(prev => ({ ...prev, terms: settings.poTerms }));
    }
  }, [settings, isModalOpen]);

  const [paymentData, setPaymentData] = useState<any>({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'Bank Transfer',
    reference: '',
    notes: ''
  });

  const fetchData = async () => {
    try {
      const [posRes, boqsRes, vendorsRes, settingsRes, projectsRes, itemsRes] = await Promise.all([
        fetch('/api/purchase-orders'),
        fetch('/api/boqs'),
        fetch('/api/vendors'),
        fetch('/api/settings'),
        fetch('/api/projects'),
        fetch('/api/items')
      ]);
      
      if (posRes.ok) {
        const data = await posRes.json();
        if (Array.isArray(data)) {
          setPos(data);
        } else {
          console.error("PO data is not an array:", data);
          setPos([]);
        }
      }
      if (boqsRes.ok) {
        const data = await boqsRes.json();
        if (Array.isArray(data)) {
          setBoqs(data);
        } else {
          console.error("BOQ data is not an array:", data);
          setBoqs([]);
        }
      }
      if (vendorsRes.ok) {
        const data = await vendorsRes.json();
        if (Array.isArray(data)) {
          setVendors(data);
        } else {
          console.error("Vendor data is not an array:", data);
          setVendors([]);
        }
      }
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        if (Array.isArray(data)) {
          setProjects(data);
        } else {
          console.error("Project data is not an array:", data);
          setProjects([]);
        }
      }
      if (itemsRes.ok) {
        const data = await itemsRes.json();
        if (Array.isArray(data)) {
          setItemMaster(data);
        } else {
          console.error("Item data is not an array:", data);
          setItemMaster([]);
        }
      }
      if (settingsRes.ok) setSettings(await settingsRes.json());
    } catch (e) {
      console.error("Failed to fetch PO data", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchData();
  }, []);

  useEffect(() => {
    if (settings?.poTerms && !newPO.terms) {
      setNewPO(prev => ({ ...prev, terms: settings.poTerms }));
    }
  }, [settings]);

  const handleExportPDF = (po: PurchaseOrder) => {
    if (!settings) {
      toast.error("Company settings not found. Please configure them in Settings.");
      return;
    }
    try {
      generatePOPDF(po, settings);
      toast.success(`Generating PDF for ${po.poNumber}...`);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      toast.error("Failed to generate PDF. Check console for details.");
    }
  };

  const handleEditPO = (po: PurchaseOrder) => {
    setEditingPO(po);
    setNewPO({
      boqId: po.boqId || '',
      projectId: po.projectId || '',
      vendorId: po.vendorId,
      terms: po.terms || '',
      status: po.status,
      items: (po.items || []).map(i => ({
        itemId: i.itemId || '',
        description: i.description || '',
        quantity: (i.quantity || 0).toString(),
        unit: i.unit || 'Nos',
        rate: (i.rate || 0).toString(),
        gstRate: (i.gstRate || 0).toString()
      }))
    });
    setIsModalOpen(true);
  };

  const handleRecordPayment = (po: PurchaseOrder) => {
    setSelectedPO(po);
    const paid = po.outflows?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const balance = po.totalAmount - paid;
    setPaymentData({
      ...paymentData,
      amount: balance.toString(),
      date: new Date().toISOString().split('T')[0]
    });
    setIsPaymentModalOpen(true);
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    try {
      const res = await fetch('/api/outflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentData,
          vendorId: selectedPO.vendorId,
          poId: selectedPO.id,
          boqId: selectedPO.boqId,
          projectId: selectedPO.projectId,
          category: 'Vendor Payment',
          description: `Payment for PO ${selectedPO.poNumber}`
        }),
      });

      if (res.ok) {
        setIsPaymentModalOpen(false);
        toast.success("Payment recorded successfully");
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to record payment");
      }
    } catch (e) {
      toast.error("Network error while recording payment");
      console.error("Failed to record payment");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingPO ? `/api/purchase-orders/${editingPO.id}` : '/api/purchase-orders';
      const method = editingPO ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPO),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingPO(null);
        setNewPO({
          boqId: '',
          projectId: '',
          vendorId: '',
          terms: '',
          status: 'Draft',
          items: [{ itemId: '', description: '', quantity: '1', unit: 'Nos', rate: '0', gstRate: '18' }]
        });
        toast.success(editingPO ? "Purchase Order updated successfully" : "Purchase Order created successfully");
        fetchSettings();
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save PO");
      }
    } catch (e) {
      toast.error("Network error while saving PO");
      console.error("Failed to save PO");
    }
  };

  const filteredPOs = pos.filter(po => 
    po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    po.vendor.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Purchase Orders</h1>
          <p className="text-slate-400 mt-2 text-base md:text-lg">Manage procurement and vendor commitments.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 md:px-8 py-3 md:py-4 rounded-2xl font-black transition-all flex items-center gap-2 shadow-xl shadow-indigo-500/20 w-full md:w-fit justify-center"
        >
          <Plus size={24} />
          Create Manual PO
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search by PO number or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
          />
        </div>
        <button className="bg-slate-900 border border-slate-800 text-slate-400 px-6 py-4 rounded-2xl font-bold hover:text-white hover:border-slate-700 transition-all flex items-center gap-2">
          <Filter size={20} />
          Filter
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredPOs.map((po) => (
          <motion.div
            key={po.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 hover:border-indigo-500/50 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[80px] rounded-full -mr-16 -mt-16" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform duration-500">
                  <FileText size={32} />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-2xl font-black text-white">{po.poNumber}</span>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      po.status?.toLowerCase() === 'draft' ? "bg-slate-800 text-slate-400" : "bg-emerald-500/10 text-emerald-400"
                    )}>
                      {po.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-slate-400 font-bold text-sm">
                    <span className="flex items-center gap-1.5">
                      <Building2 size={16} className="text-slate-600" />
                      {po.vendor.name}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                    <span className="flex items-center gap-1.5">
                      <Calendar size={16} className="text-slate-600" />
                      {new Date(po.createdAt).toLocaleDateString()}
                    </span>
                    {(po.boq || po.project) && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-slate-700" />
                        <span className="flex items-center gap-1.5">
                          <Package size={16} className="text-slate-600" />
                          {po.boq?.project?.name || po.project?.name || "Standalone"}
                          {po.boq && ` (${po.boq.name})`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:gap-8 px-0 sm:px-8 border-t sm:border-t-0 sm:border-x border-slate-800 pt-4 sm:pt-0">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total</p>
                  <p className="text-lg sm:text-xl font-black text-white">{formatCurrency(po.totalAmount, currencySymbol)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Paid</p>
                  <p className="text-lg sm:text-xl font-black text-emerald-400">
                    {formatCurrency(po.outflows?.reduce((sum, p) => sum + p.amount, 0) || 0, currencySymbol)}
                  </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Balance</p>
                    <p className="text-xl font-black text-rose-400">
                      {formatCurrency(po.totalAmount - (po.outflows?.reduce((sum, p) => sum + p.amount, 0) || 0), currencySymbol)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEditPO(po)}
                    className="p-4 bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-2xl transition-all shadow-lg"
                    title="Edit PO"
                  >
                    <Edit2 size={24} />
                  </button>
                  <button 
                    onClick={() => handleRecordPayment(po)}
                    className="p-4 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-2xl transition-all shadow-lg group/btn"
                    title="Record Payment"
                  >
                    <CreditCard size={24} />
                  </button>
                  <button 
                    onClick={() => handleExportPDF(po)}
                    className="p-4 bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-2xl transition-all shadow-lg"
                    title="Export PDF"
                  >
                    <Download size={24} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      <AnimatePresence>
        {isPaymentModalOpen && selectedPO && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">Record Payment</h2>
                  <p className="text-slate-400 font-bold">PO: {selectedPO.poNumber} | Vendor: {selectedPO.vendor.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Project: {selectedPO.boq?.project?.name || selectedPO.boq?.name || 'N/A'} | 
                    Total Amount: {formatCurrency(selectedPO.totalAmount, currencySymbol)}
                  </p>
                </div>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
                >
                  <ChevronRight className="rotate-90" size={24} />
                </button>
              </div>

              <form onSubmit={submitPayment} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Payment Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black">{currencySymbol}</span>
                      <input
                        required
                        type="text"
                        inputMode="decimal"
                        value={paymentData.amount || ''}
                        onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-8 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-black text-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Payment Date</label>
                    <input
                      required
                      type="date"
                      value={paymentData.date || ''}
                      onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Payment Method</label>
                    <select
                      value={paymentData.method || ''}
                      onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold appearance-none"
                    >
                      <option>Bank Transfer</option>
                      <option>Cash</option>
                      <option>Cheque</option>
                      <option>UPI</option>
                      <option>Credit Card</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Reference #</label>
                    <input
                      type="text"
                      placeholder="Transaction ID, Cheque #..."
                      value={paymentData.reference || ''}
                      onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Notes</label>
                  <textarea
                    value={paymentData.notes || ''}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold min-h-[100px]"
                    placeholder="Optional payment notes..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="flex-1 py-4 rounded-2xl font-black text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <ArrowDownCircle size={20} />
                    Confirm Payment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">{editingPO ? 'Edit Purchase Order' : 'Create Purchase Order'}</h2>
                  <p className="text-slate-400 font-bold">{editingPO ? `Editing ${editingPO.poNumber}` : 'Fill in the details to generate a new PO.'}</p>
                </div>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingPO(null);
                    setNewPO({
                      boqId: '',
                      projectId: '',
                      vendorId: '',
                      terms: '',
                      status: 'Draft',
                      items: [{ itemId: '', description: '', quantity: '1', unit: 'Nos', rate: '0', gstRate: '18' }]
                    });
                  }}
                  className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
                >
                  <ChevronRight className="rotate-90" size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Select Vendor</label>
                    <select
                      required
                      value={newPO.vendorId || ''}
                      onChange={(e) => setNewPO({ ...newPO, vendorId: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold appearance-none"
                    >
                      <option value="">Choose a vendor...</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Link to BOQ (Optional)</label>
                    <select
                      value={newPO.boqId || ''}
                      onChange={(e) => {
                        const selectedBoq = boqs.find(b => b.id === e.target.value);
                        setNewPO({ 
                          ...newPO, 
                          boqId: e.target.value,
                          projectId: selectedBoq?.projectId || newPO.projectId
                        });
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold appearance-none"
                    >
                      <option value="">Standalone PO</option>
                      {boqs.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Project (Required if no BOQ)</label>
                    <select
                      disabled={!!newPO.boqId}
                      required={!newPO.boqId}
                      value={newPO.projectId || ''}
                      onChange={(e) => setNewPO({ ...newPO, projectId: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold appearance-none disabled:opacity-50"
                    >
                      <option value="">Select Project...</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Status</label>
                    <select
                      value={newPO.status}
                      onChange={(e) => setNewPO({ ...newPO, status: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold appearance-none"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Sent">Sent</option>
                      <option value="Received">Received</option>
                      <option value="Approved">Approved</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-white uppercase tracking-wider">Line Items</h3>
                    <button
                      type="button"
                      onClick={() => setNewPO({
                        ...newPO,
                        items: [...newPO.items, { itemId: '', description: '', quantity: '1', unit: 'Nos', rate: '0', gstRate: '18' }]
                      })}
                      className="text-indigo-400 hover:text-indigo-300 font-black text-sm flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Add Item
                    </button>
                  </div>

                  {newPO.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-6 bg-slate-800/30 border border-slate-800 rounded-3xl relative group">
                      <div className="md:col-span-3 space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Item / Description</label>
                        <div className="flex flex-col gap-2">
                          <select
                            value={item.itemId || ''}
                            onChange={(e) => {
                              const selectedItem = itemMaster.find(i => i.id === e.target.value);
                              const newItems = [...newPO.items];
                              newItems[index].itemId = e.target.value;
                              if (selectedItem) {
                                newItems[index].description = selectedItem.description;
                                newItems[index].unit = selectedItem.unit;
                                newItems[index].rate = selectedItem.baseRate;
                              }
                              setNewPO({ ...newPO, items: newItems });
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold appearance-none"
                          >
                            <option value="">-- Select from Master (Optional) --</option>
                            {itemMaster.map(i => (
                              <option key={i.id} value={i.id}>{i.name}</option>
                            ))}
                          </select>
                          <input
                            required
                            type="text"
                            placeholder="Custom description..."
                            value={item.description || ''}
                            onChange={(e) => {
                              const newItems = [...newPO.items];
                              newItems[index].description = e.target.value;
                              setNewPO({ ...newPO, items: newItems });
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit</label>
                        <input
                          required
                          type="text"
                          value={item.unit || ''}
                          onChange={(e) => {
                            const newItems = [...newPO.items];
                            newItems[index].unit = e.target.value;
                            setNewPO({ ...newPO, items: newItems });
                          }}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                          placeholder="Nos"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Qty</label>
                        <input
                          required
                          type="text"
                          inputMode="decimal"
                          value={item.quantity || ''}
                          onChange={(e) => {
                            const newItems = [...newPO.items];
                            newItems[index].quantity = e.target.value;
                            setNewPO({ ...newPO, items: newItems });
                          }}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rate</label>
                        <input
                          required
                          type="text"
                          inputMode="decimal"
                          value={item.rate || ''}
                          onChange={(e) => {
                            const newItems = [...newPO.items];
                            newItems[index].rate = e.target.value;
                            setNewPO({ ...newPO, items: newItems });
                          }}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">GST %</label>
                        <select
                          value={item.gstRate || ''}
                          onChange={(e) => {
                            const newItems = [...newPO.items];
                            newItems[index].gstRate = e.target.value;
                            setNewPO({ ...newPO, items: newItems });
                          }}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold appearance-none"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </div>
                      <div className="md:col-span-1 flex items-end pb-3">
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = newPO.items.filter((_, i) => i !== index);
                            setNewPO({ ...newPO, items: newItems });
                          }}
                          className="text-rose-500 hover:text-rose-400 p-2"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Terms & Conditions (PO Specific)</label>
                  <textarea
                    value={newPO.terms || ''}
                    onChange={(e) => setNewPO({ ...newPO, terms: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold min-h-[150px]"
                    placeholder="Enter specific terms for this PO..."
                  />
                </div>

                <div className="mt-12 flex items-center justify-between">
                  <div className="text-slate-400 font-bold">
                    Total Items: {newPO.items.length}
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setEditingPO(null);
                        setNewPO({
                          boqId: '',
                          projectId: '',
                          vendorId: '',
                          terms: '',
                          status: 'Draft',
                          items: [{ itemId: '', description: '', quantity: '1', unit: 'Nos', rate: '0', gstRate: '18' }]
                        });
                      }}
                      className="px-8 py-4 rounded-2xl font-black text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-12 py-4 rounded-2xl font-black transition-all shadow-xl shadow-indigo-500/20"
                    >
                      {editingPO ? 'Update Purchase Order' : 'Generate Purchase Order'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
