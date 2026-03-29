import React, { useEffect, useState, useRef } from 'react';
import { 
  Plus, Search, Package, Edit2, Trash2, Check, X, MapPin, 
  Upload, Download, Filter, ChevronDown, ChevronUp, 
  TrendingUp, Layers, Users, Activity, AlertCircle,
  MoreVertical, ExternalLink, Info
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { formatCurrency, cn } from '../lib/utils';
import { GST_RATES } from '../constants';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

export default function ItemMaster() {
  const { erpSettings, fetchSettings } = useSettingsStore();
  const currencySymbol = erpSettings?.currencySymbol || '₹';
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [states, setStates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedState, setSelectedState] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuthStore();

  const [newItem, setNewItem] = useState({ 
    itemCode: '',
    name: '', 
    category: '', 
    subCategory: '',
    description: '',
    unit: '', 
    materialMake: '',
    sizeThickness: '',
    finishColor: '',
    applicationArea: '',
    vendorType: '',
    hsnSac: '',
    typicalRateBand: '',
    remarks: '',
    defaultGstRate: 18,
    status: 'Active',
    imageUrl: '',
    stateRates: [] as any[]
  });

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items');
      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        console.error("Items data is not an array:", data);
        setItems([]);
      }
    } catch (e) {
      console.error("Failed to fetch items", e);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/items/stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error("Failed to fetch stats", e);
    }
  };

  const fetchStates = async () => {
    try {
      const res = await fetch('/api/states');
      const data = await res.json();
      if (Array.isArray(data)) {
        setStates(data);
        if (data.length > 0 && !selectedState) {
          setSelectedState(data[0].name);
        }
      } else {
        console.error("States data is not an array:", data);
        setStates([]);
      }
    } catch (e) {
      console.error("Failed to fetch states", e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchItems(), fetchStats(), fetchStates()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = editingItem ? `/api/items/${editingItem.id}` : '/api/items';
    const method = editingItem ? 'PUT' : 'POST';
    
    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    });

    if (res.ok) {
      toast.success(editingItem ? 'Item updated successfully' : 'Item created successfully');
      setIsModalOpen(false);
      setEditingItem(null);
      resetNewItem();
      fetchItems();
      fetchStats();
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed to save item');
    }
  };

  const resetNewItem = () => {
    setNewItem({ 
      itemCode: '',
      name: '', 
      category: '', 
      subCategory: '',
      description: '',
      unit: '', 
      materialMake: '',
      sizeThickness: '',
      finishColor: '',
      applicationArea: '',
      vendorType: '',
      hsnSac: '',
      typicalRateBand: '',
      remarks: '',
      defaultGstRate: 18,
      status: 'Active',
      imageUrl: '',
      stateRates: (states || []).map(s => ({ 
        state: s.name,
        labourRate: 0, 
        supplyOnlyRate: 0, 
        supplyPlusInstallationRate: 0 
      }))
    });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setNewItem({
      itemCode: item.itemCode || '',
      name: item.name,
      category: item.category,
      subCategory: item.subCategory || '',
      description: item.description || '',
      unit: item.unit,
      materialMake: item.materialMake || '',
      sizeThickness: item.sizeThickness || '',
      finishColor: item.finishColor || '',
      applicationArea: item.applicationArea || '',
      vendorType: item.vendorType || '',
      hsnSac: item.hsnSac || '',
      typicalRateBand: item.typicalRateBand || '',
      remarks: item.remarks || '',
      defaultGstRate: item.defaultGstRate || 18,
      status: item.status || 'Active',
      imageUrl: item.imageUrl || '',
      stateRates: (states || []).map(s => {
        const existing = (item.stateRates || []).find((sr: any) => sr.state === s.name);
        return { 
          state: s.name,
          labourRate: existing ? existing.labourRate : 0,
          supplyOnlyRate: existing ? existing.supplyOnlyRate : 0,
          supplyPlusInstallationRate: existing ? existing.supplyPlusInstallationRate : 0
        };
      })
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Item deleted successfully');
        setDeleteConfirmId(null);
        fetchItems();
        fetchStats();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete item');
      }
    } catch (e) {
      toast.error('Network error deleting item');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.imageUrl) {
        setNewItem({ ...newItem, imageUrl: data.imageUrl });
        toast.success('Image uploaded successfully');
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch (err) {
      toast.error('Error uploading image');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      setImportLoading(true);
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Map Excel columns to our schema
        const mappedItems = (data || []).map((row: any) => ({
          itemCode: row['Item Code'] || row['Code'] || '',
          name: row['Item Name'] || row['Name'] || '',
          category: row['Category'] || '',
          subCategory: row['Sub Category'] || '',
          description: row['Description'] || '',
          unit: row['Unit'] || '',
          materialMake: row['Material/Make'] || '',
          sizeThickness: row['Size/Thickness'] || '',
          finishColor: row['Finish/Color'] || '',
          applicationArea: row['Application Area'] || '',
          vendorType: row['Vendor Type'] || '',
          hsnSac: row['HSN/SAC'] || '',
          typicalRateBand: row['Rate Band'] || '',
          remarks: row['Remarks'] || '',
          status: 'Active'
        }));

        const res = await fetch('/api/items/bulk-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: mappedItems, mode: 'upsert' })
        });

        if (res.ok) {
          const result = await res.json();
          toast.success(`Import successful! Imported: ${result.summary.imported}, Updated: ${result.summary.updated}`);
          fetchItems();
          fetchStats();
        } else {
          toast.error('Failed to import items');
        }
      } catch (err) {
        console.error(err);
        toast.error('Error processing Excel file');
      } finally {
        setImportLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.itemCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', ...Array.from(new Set((items || []).map(i => i.category)))];

  const getRatesForState = (item: any, stateName: string) => {
    const stateRate = item.stateRates?.find((sr: any) => sr.state === stateName);
    return stateRate ? {
      labour: stateRate.labourRate,
      supply: stateRate.supplyOnlyRate,
      both: stateRate.supplyPlusInstallationRate
    } : { labour: 0, supply: 0, both: 0 };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Interior Item Master</h1>
          <p className="text-slate-400 mt-2 text-base md:text-lg">Central repository for specifications, state-wise rates, and vendor mapping.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-fit">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".xlsx,.xls" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importLoading}
            className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all border border-slate-700"
          >
            {importLoading ? <Activity className="animate-spin" size={20} /> : <Upload size={20} />}
            Import Excel
          </button>
          <button
            onClick={() => {
              resetNewItem();
              setIsModalOpen(true);
            }}
            className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={22} />
            Add New Item
          </button>
        </div>
      </div>

      {/* Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                <Package size={24} />
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Total Items</p>
                <h3 className="text-2xl font-bold text-white">{stats.totalItems}</h3>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                <Layers size={24} />
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Categories</p>
                <h3 className="text-2xl font-bold text-white">{stats.categoriesCount}</h3>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400">
                <Users size={24} />
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Vendor Mappings</p>
                <h3 className="text-2xl font-bold text-white">{stats.totalVendorsMapped}</h3>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Active Items</p>
                <h3 className="text-2xl font-bold text-white">{stats.activeItems}</h3>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Table Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                type="text"
                placeholder="Search by name, code, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
              <Filter size={18} className="text-slate-500" />
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-sm text-white focus:outline-none font-medium min-w-[120px]"
              >
                {(categories || []).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl px-4 py-3">
            <MapPin size={18} className="text-indigo-400" />
            <span className="text-sm font-bold text-indigo-300 uppercase tracking-wider">Pricing State:</span>
            <select 
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-transparent text-sm text-white focus:outline-none font-bold cursor-pointer"
            >
              {(states || []).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <table className="w-full text-left border-collapse min-w-[1000px] lg:min-w-0">
            <thead>
              <tr className="bg-slate-800/30 text-slate-500 text-[11px] uppercase tracking-[0.2em] font-black">
                <th className="px-8 py-5">Item Details</th>
                <th className="px-6 py-5">Category</th>
                <th className="px-6 py-5">Unit</th>
                <th className="px-6 py-5 text-right">Labour</th>
                <th className="px-6 py-5 text-right">Supply</th>
                <th className="px-6 py-5 text-right">Total (S+I)</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {(filteredItems || []).length > 0 ? (filteredItems || []).map((item) => {
                const rates = getRatesForState(item, selectedState);
                return (
                  <tr key={item.id} className="group hover:bg-slate-800/20 transition-all duration-300">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform duration-300 border border-slate-700 overflow-hidden">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Package size={24} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded uppercase tracking-wider">
                              {item.itemCode || 'NO-CODE'}
                            </span>
                            <span className={cn(
                              "text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider",
                              item.status === 'Active' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                            )}>
                              {item.status}
                            </span>
                          </div>
                          <div className="font-bold text-white text-lg mt-1">{item.name}</div>
                          <div className="text-xs text-slate-500 mt-1 line-clamp-1 max-w-xs italic">
                            {item.subCategory} • {item.materialMake}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className="px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 uppercase tracking-wide">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-sm font-medium text-slate-400">{item.unit}</td>
                    <td className="px-6 py-6 text-right font-mono text-sm text-slate-300">
                      {rates.labour > 0 ? formatCurrency(rates.labour, currencySymbol) : '-'}
                    </td>
                    <td className="px-6 py-6 text-right font-mono text-sm text-slate-300">
                      {rates.supply > 0 ? formatCurrency(rates.supply, currencySymbol) : '-'}
                    </td>
                    <td className="px-6 py-6 text-right font-mono text-base font-bold text-indigo-400">
                      {rates.both > 0 ? formatCurrency(rates.both, currencySymbol) : '-'}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all border border-slate-700"
                          title="Edit Item"
                        >
                          <Edit2 size={18} />
                        </button>
                        
                        {user?.role === 'Admin' && (
                          <button 
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="p-2.5 bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 rounded-xl transition-all border border-slate-700"
                            title="Delete Item"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-6 bg-slate-800 rounded-full text-slate-600">
                        <Search size={48} />
                      </div>
                      <div className="text-slate-400 font-medium text-lg">No items found matching your criteria.</div>
                      <button 
                        onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                        className="text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-widest text-xs"
                      >
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Section */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">
                  {editingItem ? 'Edit Item Specifications' : 'New Item Master Entry'}
                </h2>
                <p className="text-slate-500 mt-1 font-medium">Define technical details and state-wise pricing bands.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl transition-all"
              >
                <X size={28} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-10 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Basic Info */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Item Image</label>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                          {newItem.imageUrl ? (
                            <img src={newItem.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Package size={32} className="text-slate-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <input
                            type="file"
                            onChange={handleImageUpload}
                            accept="image/*"
                            className="hidden"
                            id="item-image-upload"
                          />
                          <label
                            htmlFor="item-image-upload"
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border border-slate-700 flex items-center gap-2 w-fit"
                          >
                            <Upload size={14} />
                            {newItem.imageUrl ? 'Change Image' : 'Upload Image'}
                          </label>
                          {newItem.imageUrl && (
                            <button 
                              type="button"
                              onClick={() => setNewItem({ ...newItem, imageUrl: '' })}
                              className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-2 hover:text-rose-400 transition-colors"
                            >
                              Remove Image
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Item Code</label>
                      <input
                        type="text"
                        value={newItem.itemCode}
                        onChange={(e) => setNewItem({ ...newItem, itemCode: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                        placeholder="e.g. WD-PLY-001"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Item Name</label>
                      <input
                        type="text"
                        value={newItem.name || ''}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                        placeholder="e.g. 19mm Commercial Plywood"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Category</label>
                      <input
                        type="text"
                        value={newItem.category || ''}
                        onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                        placeholder="e.g. Woodwork"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Sub Category</label>
                      <input
                        type="text"
                        value={newItem.subCategory || ''}
                        onChange={(e) => setNewItem({ ...newItem, subCategory: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                        placeholder="e.g. Plywood"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Technical Description</label>
                    <textarea
                      value={newItem.description || ''}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all h-32 resize-none font-medium leading-relaxed"
                      placeholder="Detailed technical specifications, material composition, etc..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Unit</label>
                      <input
                        type="text"
                        value={newItem.unit || ''}
                        onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                        placeholder="SQFT, RFT, NOS..."
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Material/Make</label>
                      <input
                        type="text"
                        value={newItem.materialMake || ''}
                        onChange={(e) => setNewItem({ ...newItem, materialMake: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                        placeholder="Brand or Material"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Size/Thickness</label>
                      <input
                        type="text"
                        value={newItem.sizeThickness || ''}
                        onChange={(e) => setNewItem({ ...newItem, sizeThickness: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                        placeholder="e.g. 19mm, 8'x4'"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">HSN/SAC Code</label>
                      <input
                        type="text"
                        value={newItem.hsnSac || ''}
                        onChange={(e) => setNewItem({ ...newItem, hsnSac: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Rate Band</label>
                      <select
                        value={newItem.typicalRateBand || ''}
                        onChange={(e) => setNewItem({ ...newItem, typicalRateBand: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                      >
                        <option value="">Select Band</option>
                        <option value="Economy">Economy</option>
                        <option value="Standard">Standard</option>
                        <option value="Premium">Premium</option>
                        <option value="Luxury">Luxury</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Default GST Rate (%)</label>
                      <select
                        value={newItem.defaultGstRate || 0}
                        onChange={(e) => setNewItem({ ...newItem, defaultGstRate: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                        required
                      >
                        {(GST_RATES || []).map(rate => (
                          <option key={rate} value={rate}>{rate}%</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Status</label>
                      <select
                        value={newItem.status || 'Active'}
                        onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* State Rates Sidebar */}
                <div className="space-y-6">
                  <div className="bg-slate-800/30 border border-slate-800 rounded-[2rem] p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                      <TrendingUp className="text-indigo-400" size={20} />
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">State-wise Pricing</h3>
                    </div>
                    
                    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {(newItem.stateRates || []).map((sr, idx) => (
                        <div key={sr.state} className="space-y-3 p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-indigo-400 uppercase tracking-wider">{sr.state}</span>
                            <Info size={14} className="text-slate-600" />
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-4">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Labour</label>
                              <input
                                type="number"
                                value={sr.labourRate}
                                onChange={(e) => {
                                  const updated = [...newItem.stateRates];
                                  updated[idx].labourRate = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  setNewItem({ ...newItem, stateRates: updated });
                                }}
                                className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-right text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                              />
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Supply</label>
                              <input
                                type="number"
                                value={sr.supplyOnlyRate}
                                onChange={(e) => {
                                  const updated = [...newItem.stateRates];
                                  updated[idx].supplyOnlyRate = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  setNewItem({ ...newItem, stateRates: updated });
                                }}
                                className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-right text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                              />
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Total</label>
                              <input
                                type="number"
                                value={sr.supplyPlusInstallationRate}
                                onChange={(e) => {
                                  const updated = [...newItem.stateRates];
                                  updated[idx].supplyPlusInstallationRate = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  setNewItem({ ...newItem, stateRates: updated });
                                }}
                                className="w-24 bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-2 py-1 text-xs text-right text-indigo-400 font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-[2rem] space-y-3">
                    <div className="flex items-center gap-2 text-amber-400">
                      <AlertCircle size={18} />
                      <span className="text-xs font-black uppercase tracking-wider">Note</span>
                    </div>
                    <p className="text-[11px] text-amber-200/60 leading-relaxed font-medium">
                      Rates defined here serve as the baseline for BOQ estimations. Actual procurement rates may vary based on vendor negotiations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-10 border-t border-slate-800 sticky bottom-0 bg-slate-900/80 backdrop-blur-md pb-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl transition-all border border-slate-700 uppercase tracking-widest text-xs"
                >
                  Discard Changes
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl shadow-2xl shadow-indigo-500/40 transition-all hover:scale-[1.01] active:scale-[0.99] uppercase tracking-[0.2em] text-xs"
                >
                  {editingItem ? 'Save Item Updates' : 'Publish to Master'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        title="Delete Item"
        message="Are you sure you want to delete this item? This action cannot be undone and may affect existing BOQs."
        confirmText="Delete Item"
        variant="danger"
      />
    </div>
  );
}
