import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { PageTransition } from '../components/ui/PageTransition';
import { toast } from 'sonner';
import { Plus, Search, Users, Mail, Phone, ExternalLink, ShieldCheck, CheckCircle2, Trash2, Link as LinkIcon, MapPin, Clock, Check, X, Edit2, PackagePlus } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';

export default function Vendors() {
  const { erpSettings, fetchSettings } = useSettingsStore();
  const currencySymbol = erpSettings?.currencySymbol || '₹';
  const [vendors, setVendors] = useState<any[]>([]);
  const [availableStates, setAvailableStates] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: '', email: '', contactInfo: '', state: '' });
  const [generatedLink, setGeneratedLink] = useState('');
  const [selectedVendorRates, setSelectedVendorRates] = useState<any[]>([]);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [currentVendor, setCurrentVendor] = useState<any>(null);
  const { user } = useAuthStore();

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchVendors = async () => {
    try {
      const [vRes, sRes] = await Promise.all([
        fetch('/api/vendors'),
        fetch('/api/states')
      ]);
      if (vRes.ok) {
        const vData = await vRes.json();
        if (Array.isArray(vData)) {
          setVendors(vData);
        } else {
          console.error("Vendors data is not an array:", vData);
          setVendors([]);
        }
      }
      if (sRes.ok) {
        const statesData = await sRes.json();
        if (Array.isArray(statesData)) {
          setAvailableStates(statesData);
          if (statesData.length > 0 && !newVendor.state) {
            setNewVendor(prev => ({ ...prev, state: statesData[0].name }));
          }
        } else {
          console.error("States data is not an array:", statesData);
          setAvailableStates([]);
        }
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchVendors();
  }, []);

  const handleDelete = async (id: string) => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/vendors/${id}`, { 
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        toast.success('Vendor deleted successfully');
        setDeleteConfirmId(null);
        fetchVendors();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete vendor');
      }
    } catch (e: any) {
      toast.error('Network Error: ' + e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const copyPortalLink = (token: string) => {
    const link = `${window.location.origin}/vendor-portal/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Vendor Portal link copied to clipboard!');
  };

  const fetchVendorRates = async (vendor: any) => {
    try {
      const res = await fetch(`/api/vendor-rates`);
      const data = await res.json();
      const filtered = data.filter((r: any) => r.vendorId === vendor.id);
      setSelectedVendorRates(filtered);
      setCurrentVendor(vendor);
      setIsRatesModalOpen(true);
    } catch (err) {
      console.error('Error fetching vendor rates:', err);
    }
  };

  const handleUpdateRateStatus = async (rateId: string, status: string) => {
    try {
      const endpoint = status === 'Active' ? `/api/vendor-rates/${rateId}/approve` : `/api/vendor-rates/${rateId}`;
      const method = status === 'Active' ? 'POST' : 'PATCH';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchVendorRates(currentVendor);
      }
    } catch (err) {
      console.error('Error updating rate status:', err);
    }
  };

  const handleConvertItem = async (rateId: string) => {
    try {
      const res = await fetch(`/api/vendor-rates/${rateId}/convert`, {
        method: 'POST'
      });
      if (res.ok) {
        toast.success('Item successfully added to Master List!');
        fetchVendorRates(currentVendor);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to convert item');
      }
    } catch (err) {
      console.error('Error converting item:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;
    
    if (!newVendor.name || !newVendor.email || !newVendor.state) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVendor),
      });
      if (res.ok) {
        toast.success('Vendor onboarded successfully');
        const data = await res.json();
        setGeneratedLink(data.submissionUrl);
        setNewVendor({ name: '', email: '', contactInfo: '', state: availableStates[0]?.name || '' });
        fetchVendors();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to onboard vendor');
      }
    } catch (err: any) {
      toast.error('Network Error: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-white tracking-tight">Vendor Management</h1>
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
              user?.role === 'Approver' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-500 border border-slate-700"
            )}>
              {user?.role} Access
            </span>
          </div>
          <p className="text-slate-400">Track vendor performance and rate submissions.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus size={20} />
          Add Vendor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendors.map((vendor) => (
          <div key={vendor.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Users size={24} />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => copyPortalLink(vendor.token)}
                  className="p-2 text-slate-500 hover:text-indigo-400 transition-colors bg-slate-800/50 rounded-lg"
                  title="Copy Portal Link"
                >
                  <LinkIcon size={18} />
                </button>
                {user?.role === 'Approver' && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteConfirmId(vendor.id);
                    }}
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors bg-slate-800/50 rounded-lg"
                    title="Delete Vendor"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-1">{vendor.name}</h3>
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Mail size={14} />
                {vendor.email}
              </div>
              {vendor.contactInfo && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Phone size={14} />
                  {vendor.contactInfo}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <MapPin size={14} />
                {vendor.state}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck size={14} />
                Verified Partner
              </div>
              <button 
                onClick={() => fetchVendorRates(vendor)}
                className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
              >
                View Rates
              </button>
            </div>
          </div>
        ))}
      </div>

      {isRatesModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Rates for {currentVendor?.name}</h2>
                <p className="text-sm text-slate-400">{currentVendor?.state} Region</p>
              </div>
              <button onClick={() => setIsRatesModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
                    <th className="pb-4 font-medium">Item</th>
                    <th className="pb-4 font-medium">Rate</th>
                    <th className="pb-4 font-medium">Unit</th>
                    <th className="pb-4 font-medium">Status</th>
                    <th className="pb-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedVendorRates.length > 0 ? selectedVendorRates.map((rate) => (
                    <tr key={rate.id} className="group">
                      <td className="py-4">
                        {rate.item ? (
                          <div>
                            <div className="font-medium text-white">{rate.item.name}</div>
                            <div className="text-xs text-slate-500">{rate.item.category}</div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium text-amber-400 flex items-center gap-2">
                              {rate.vendorItemName}
                              <span className="text-[10px] bg-amber-400/10 px-1.5 py-0.5 rounded uppercase tracking-tighter">New Item</span>
                            </div>
                            <div className="text-xs text-slate-500">{rate.vendorCategory}</div>
                          </div>
                        )}
                      </td>
                      <td className="py-4 font-mono text-slate-300">{formatCurrency(rate.submittedRate, currencySymbol)}</td>
                      <td className="py-4 text-slate-400">{rate.vendorUnit}</td>
                      <td className="py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          rate.status === 'Active' ? "bg-emerald-500/20 text-emerald-400" :
                          rate.status === 'Rejected' ? "bg-rose-500/20 text-rose-400" :
                          "bg-amber-500/20 text-amber-400"
                        )}>
                          {rate.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {rate.status === 'Pending' && (
                            <>
                              <button 
                                onClick={() => handleUpdateRateStatus(rate.id, 'Active')}
                                className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <Check size={18} />
                              </button>
                              <button 
                                onClick={() => handleUpdateRateStatus(rate.id, 'Rejected')}
                                className="p-1.5 text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <X size={18} />
                              </button>
                            </>
                          )}
                          {!rate.item && rate.status === 'Active' && (
                            <button 
                              onClick={() => handleConvertItem(rate.id)}
                              className="p-1.5 text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold uppercase"
                              title="Add to Master List"
                            >
                              <PackagePlus size={18} />
                              Add to Master
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500">No rates submitted by this vendor yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">Add New Vendor</h2>
            </div>
            {generatedLink ? (
              <div className="p-6 space-y-4">
                <div className="p-4 bg-emerald-400/10 border border-emerald-400/20 rounded-xl text-center">
                  <CheckCircle2 className="text-emerald-400 mx-auto mb-2" size={32} />
                  <p className="text-sm font-medium text-white">Vendor Added Successfully!</p>
                  <p className="text-xs text-slate-400 mt-1">An invitation email has been simulated.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Submission Link (Share with Vendor)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-xs text-indigo-400 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedLink);
                        toast.success('Link copied to clipboard!');
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setGeneratedLink('');
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Vendor Name</label>
                <input
                  type="text"
                  value={newVendor.name || ''}
                  onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                <input
                  type="email"
                  value={newVendor.email || ''}
                  onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Contact Info</label>
                <input
                  type="text"
                  value={newVendor.contactInfo || ''}
                  onChange={(e) => setNewVendor({ ...newVendor, contactInfo: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. +1 234 567 890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">State</label>
                <select
                  value={newVendor.state || ''}
                  onChange={(e) => setNewVendor({ ...newVendor, state: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {availableStates.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
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
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg shadow-lg shadow-indigo-500/20 transition-colors"
                >
                  Add Vendor
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    )}
      <ConfirmationModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        title="Delete Vendor"
        message="Are you sure you want to delete this vendor? This action cannot be undone."
        confirmText="Delete Vendor"
        isLoading={isDeleting}
      />
    </div>
    </PageTransition>
  );
}
