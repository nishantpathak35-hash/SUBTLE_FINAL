import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Send, CheckCircle2, User, Phone, Package, Plus, Search, X } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';

export default function VendorSetup() {
  const { token } = useParams();
  const [vendor, setVendor] = useState<any>(null);
  const [masterItems, setMasterItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [rates, setRates] = useState<Record<string, string>>({});
  const [customItems, setCustomItems] = useState<any[]>([]);
  const [contactInfo, setContactInfo] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/public/vendor-setup/${token}`);
        if (res.ok) {
          const data = await res.json();
          setVendor(data.vendor);
          setMasterItems(data.items);
          setContactInfo(data.vendor.contactInfo || '');
          
          // Pre-select items that already have rates
          const initialRates: Record<string, string> = {};
          const preSelected: any[] = [];
          (data.vendor.rates || []).forEach((r: any) => {
            if (r.item) {
              initialRates[r.itemId] = r.submittedRate.toString();
              preSelected.push(r.item);
            }
          });
          setRates(initialRates);
          setSelectedItems(preSelected);
        }
      } catch (e) {
        console.error("Failed to fetch data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const handleRateChange = (itemId: string, value: string) => {
    setRates(prev => ({ ...prev, [itemId]: value }));
  };

  const handleAddItem = (item: any) => {
    if (!selectedItems.find(i => i.id === item.id)) {
      setSelectedItems([...selectedItems, item]);
    }
    setSearchTerm('');
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter(i => i.id !== itemId));
    const newRates = { ...rates };
    delete newRates[itemId];
    setRates(newRates);
  };

  const handleAddCustomItem = () => {
    setCustomItems([...customItems, { name: '', category: '', unit: '', rate: '' }]);
  };

  const handleCustomItemChange = (index: number, field: string, value: any) => {
    const newItems = [...customItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setCustomItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ratesArray = selectedItems.map(item => ({
      itemId: item.id,
      submittedRate: parseFloat(rates[item.id] || '0') || 0
    }));

    const res = await fetch(`/api/public/vendor-setup/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contactInfo, 
        rates: ratesArray, 
        customItems: (customItems || []).map(item => ({
          ...item,
          rate: parseFloat(item.rate || '0') || 0
        }))
      }),
    });
    if (res.ok) {
      setIsSubmitted(true);
    }
  };

  const filteredMasterItems = masterItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedItems.find(si => si.id === item.id)
  );

  if (isLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  );

  if (!vendor) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Invalid Link</h1>
        <p className="text-slate-400">This setup link is invalid or has expired.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20 mb-4">
            <FileText size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Vendor Onboarding</h1>
          <p className="text-slate-400 mt-2">Welcome, {vendor.name}. Please complete your profile and submit item rates.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          {isSubmitted ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-emerald-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} className="text-emerald-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Profile Updated</h2>
              <p className="text-slate-400 text-lg">Thank you for submitting your details and rates. Our procurement team will review them shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="p-8 border-b border-slate-800 space-y-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <User size={20} className="text-indigo-400" />
                  Company Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Company Name</label>
                    <input
                      type="text"
                      value={vendor?.name || ''}
                      disabled
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={vendor?.email || ''}
                      disabled
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Contact Information (Phone / Address)</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 text-slate-500" size={18} />
                      <textarea
                        value={contactInfo}
                        onChange={(e) => setContactInfo(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                        placeholder="Enter your contact details..."
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Package size={20} className="text-indigo-400" />
                    Product Rates
                  </h2>
                </div>
                
                {/* Item Search/Add */}
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 text-slate-500" size={18} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Search and add products from our catalog..."
                    />
                  </div>
                  
                  {searchTerm && (
                    <div className="absolute z-10 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                      {filteredMasterItems.length > 0 ? (
                        filteredMasterItems.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleAddItem(item)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-700 flex items-center justify-between transition-colors"
                          >
                            <div>
                              <p className="text-sm font-bold text-white">{item.name}</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{item.category} • {item.unit}</p>
                            </div>
                            <Plus size={16} className="text-indigo-400" />
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-slate-500 italic">No matching products found.</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider font-bold">
                        <th className="px-6 py-4">Item Name</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Unit</th>
                        <th className="px-6 py-4 text-right">Your Rate (₹)</th>
                        <th className="px-6 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {selectedItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 font-medium text-white">{item.name}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-400">{item.unit}</td>
                          <td className="px-6 py-4 text-right">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={rates[item.id] || ''}
                              onChange={(e) => handleRateChange(item.id, e.target.value)}
                              className="w-32 bg-slate-800 border border-slate-700 rounded px-3 py-1 text-right text-white font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              placeholder="0.00"
                              required
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-slate-500 hover:text-red-400 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {selectedItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-slate-500 italic">
                            No products added yet. Use the search bar above to add products.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Package size={20} className="text-indigo-400" />
                    New Product Submissions
                  </h2>
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Add New Item
                  </button>
                </div>
                <p className="text-sm text-slate-400">If you have items not listed in our catalog, please add them here.</p>
                
                <div className="space-y-4">
                  {customItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-800/30 rounded-xl border border-slate-800">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Item Name</label>
                        <input
                          type="text"
                          value={item.name || ''}
                          onChange={(e) => handleCustomItemChange(index, 'name', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none"
                          placeholder="e.g. Premium Cement Grade A"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unit</label>
                        <input
                          type="text"
                          value={item.unit || ''}
                          onChange={(e) => handleCustomItemChange(index, 'unit', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none"
                          placeholder="e.g. BAG"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rate (₹)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.rate || ''}
                          onChange={(e) => handleCustomItemChange(index, 'rate', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white font-bold focus:outline-none"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 bg-slate-800/20 border-t border-slate-800 flex justify-end">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                >
                  <Send size={20} />
                  Submit Profile & Rates
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
