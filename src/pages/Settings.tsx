import React, { useEffect, useState } from 'react';
import { MapPin, Plus, Trash2, AlertCircle, Building2, FileText, Hash, Save, CheckCircle2, Users, UserPlus, Mail, Shield, ShieldCheck, X, Lock, UserCog, ChevronDown, RefreshCcw, History, Clock, Check, AlertTriangle, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { GST_RATES } from '../constants';
import { toast } from 'sonner';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

const ROLES = ['Admin', 'Estimator', 'Procurement', 'Viewer'];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'company' | 'po' | 'states' | 'users' | 'defaults' | 'email'>('company');
  const [emailConfig, setEmailConfig] = useState<any>(null);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isVerifyingSmtp, setIsVerifyingSmtp] = useState(false);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);
  const [settings, setSettings] = useState({
    companyName: '',
    address: '',
    logoUrl: '',
    gstNumber: '',
    panNumber: '',
    poSeries: 'PO',
    poNextNumber: 1,
    poTerms: '',
    defaultGstRate: 18,
    defaultMargin: 20,
    currencySymbol: '₹',
    projectCategories: 'Residential,Commercial,Industrial,Infrastructure',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: ''
  });
  const [states, setStates] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [newState, setNewState] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'Estimator' });
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState<string | null>(null);
  const [showClearLogsConfirm, setShowClearLogsConfirm] = useState(false);
  const [showDeleteStateConfirm, setShowDeleteStateConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user: currentUser } = useAuthStore();

  const fetchData = async () => {
    try {
      const [settingsRes, statesRes, usersRes, emailRes, logsRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/states'),
        fetch('/api/users'),
        fetch('/api/email-config'),
        fetch('/api/email-logs')
      ]);
      
      let finalSettings: any = {};
      if (settingsRes.ok) {
        finalSettings = await settingsRes.json();
      }
      
      if (statesRes.ok) {
        const statesData = await statesRes.json();
        setStates(statesData);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }

      if (emailRes.ok) {
        const emailData = await emailRes.json();
        setEmailConfig(emailData);
        
        if (!finalSettings.smtpHost && emailData.host) finalSettings.smtpHost = emailData.host;
        if (!finalSettings.smtpUser && emailData.user) finalSettings.smtpUser = emailData.user;
        if (!finalSettings.smtpFrom && emailData.from) finalSettings.smtpFrom = emailData.from;
        if (!finalSettings.smtpPort && emailData.port) finalSettings.smtpPort = emailData.port;
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setEmailLogs(logsData);
      }
      
      setSettings(prev => ({ ...prev, ...finalSettings }));
    } catch (e) {
      console.error("Failed to fetch settings data", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmailLogs = async () => {
    setIsFetchingLogs(true);
    try {
      const res = await fetch('/api/email-logs');
      if (res.ok) {
        const data = await res.json();
        setEmailLogs(data);
      }
    } catch (e) {
      console.error("Failed to fetch email logs", e);
    } finally {
      setIsFetchingLogs(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const { erpSettings, fetchSettings: refreshGlobalSettings } = useSettingsStore();

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    // Validate SMTP Host
    if (settings.smtpHost && settings.smtpHost.includes('@')) {
      setError('Invalid SMTP Host. Please provide a valid hostname (e.g., smtp.gmail.com), not an email address.');
      setIsSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSuccess('Settings updated successfully');
        await refreshGlobalSettings();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update settings');
      }
    } catch (e) {
      setError('Network error while saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        setIsUserModalOpen(false);
        setEditingUser(null);
        setNewUser({ name: '', email: '', password: '', role: 'Estimator' });
        fetchData();
        setSuccess(editingUser ? 'User updated successfully' : 'User added successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || `Failed to ${editingUser ? 'update' : 'add'} user`);
      }
    } catch (e) {
      setError(`Failed to ${editingUser ? 'update' : 'add'} user`);
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setNewUser({
      name: user.name || '',
      email: user.email || '',
      password: '', // Don't pre-fill password
      role: user.role || 'Estimator'
    });
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser?.id) {
      toast.error("You cannot delete yourself.");
      return;
    }
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('User deleted successfully');
        setShowDeleteUserConfirm(null);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete user');
      }
    } catch (e) {
      toast.error('Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddState = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newState.trim()) return;

    try {
      const res = await fetch('/api/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newState.trim() }),
      });

      if (res.ok) {
        setNewState('');
        setError(null);
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add state');
      }
    } catch (e: any) {
      setError(`Network error: ${e.message}`);
    }
  };

  const handleDeleteState = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/states/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('State deleted successfully');
        setShowDeleteStateConfirm(null);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete state");
      }
    } catch (e) {
      toast.error("Network error during deletion");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Settings</h1>
        <p className="text-slate-400 mt-2 text-base md:text-lg">Configure your company profile and application defaults.</p>
      </div>

      <div className="flex flex-wrap gap-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('company')}
          className={cn(
            "px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'company' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white hover:bg-slate-800"
          )}
        >
          <Building2 size={18} />
          Company Info
        </button>
        <button
          onClick={() => setActiveTab('po')}
          className={cn(
            "px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'po' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white hover:bg-slate-800"
          )}
        >
          <Hash size={18} />
          PO Config
        </button>
        <button
          onClick={() => setActiveTab('states')}
          className={cn(
            "px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'states' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white hover:bg-slate-800"
          )}
        >
          <MapPin size={18} />
          States
        </button>
        {currentUser?.role === 'Admin' && (
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              "px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
              activeTab === 'users' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <Users size={18} />
            Users
          </button>
        )}
        <button
          onClick={() => setActiveTab('defaults')}
          className={cn(
            "px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'defaults' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white hover:bg-slate-800"
          )}
        >
          <ShieldCheck size={18} />
          ERP Defaults
        </button>
        {currentUser?.role === 'Admin' && (
          <button
            onClick={() => setActiveTab('email')}
            className={cn(
              "px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
              activeTab === 'email' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <Mail size={18} />
            Email
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {activeTab === 'company' && (
              <motion.div
                key="company"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl"
              >
                <div className="p-8 border-b border-slate-800 bg-slate-800/30">
                  <h2 className="text-xl font-bold text-white">Company Profile</h2>
                  <p className="text-sm text-slate-500 mt-1">This information will appear on your generated PDFs.</p>
                </div>
                <form onSubmit={handleSaveSettings} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Company Name</label>
                      <input
                        type="text"
                        value={settings.companyName || ''}
                        onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                        placeholder="Subtle Infra"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">GST Number</label>
                      <input
                        type="text"
                        value={settings.gstNumber || ''}
                        onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                        placeholder="27AAAAA0000A1Z5"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">PAN Number</label>
                      <input
                        type="text"
                        value={settings.panNumber || ''}
                        onChange={(e) => setSettings({ ...settings, panNumber: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                        placeholder="ABCDE1234F"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Logo URL</label>
                      <input
                        type="text"
                        value={settings.logoUrl || ''}
                        onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Address</label>
                      <textarea
                        value={settings.address || ''}
                        onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold min-h-[100px]"
                        placeholder="123, Business Park, Mumbai, Maharashtra"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center gap-4">
                      {success && (
                        <span className="text-emerald-400 text-sm flex items-center gap-2">
                          <CheckCircle2 size={16} />
                          {success}
                        </span>
                      )}
                      {error && (
                        <span className="text-rose-400 text-sm flex items-center gap-2">
                          <AlertCircle size={16} />
                          {error}
                        </span>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-black transition-all flex items-center gap-2 shadow-xl shadow-indigo-500/20"
                    >
                      {isSaving ? 'Saving...' : (
                        <>
                          <Save size={20} />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'po' && (
              <motion.div
                key="po"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl"
              >
                <div className="p-8 border-b border-slate-800 bg-slate-800/30">
                  <h2 className="text-xl font-bold text-white">Purchase Order Configuration</h2>
                  <p className="text-sm text-slate-500 mt-1">Manage PO numbering series and standard terms.</p>
                </div>
                <form onSubmit={handleSaveSettings} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">PO Series Prefix</label>
                      <input
                        type="text"
                        value={settings.poSeries || ''}
                        onChange={(e) => setSettings({ ...settings, poSeries: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                        placeholder="PO"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Next PO Number</label>
                      <input
                        type="number"
                        value={settings.poNextNumber || 1}
                        onChange={(e) => setSettings({ ...settings, poNextNumber: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Standard Terms & Conditions</label>
                      <textarea
                        value={settings.poTerms || ''}
                        onChange={(e) => setSettings({ ...settings, poTerms: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold min-h-[200px]"
                        placeholder="1. Payment within 30 days...&#10;2. Delivery at site..."
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end pt-4">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-black transition-all flex items-center gap-2 shadow-xl shadow-indigo-500/20"
                    >
                      {isSaving ? 'Saving...' : (
                        <>
                          <Save size={20} />
                          Save PO Config
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'states' && (
              <motion.div
                key="states"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl"
              >
                <div className="p-8 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Manage States</h2>
                    <p className="text-sm text-slate-500 mt-1">Define states for regional rate management.</p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                    {states.length} Active
                  </span>
                </div>
                <div className="p-8 space-y-6">
                  <form onSubmit={handleAddState} className="flex gap-3">
                    <input
                      type="text"
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      placeholder="Enter state name (e.g. Gujarat)"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                    />
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-black transition-all flex items-center gap-2 shadow-xl shadow-indigo-500/20"
                    >
                      <Plus size={20} />
                      Add
                    </button>
                  </form>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    <AnimatePresence mode="popLayout">
                      {states.map((state) => (
                        <motion.div
                          key={state.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl hover:bg-slate-800 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400">
                              <MapPin size={16} />
                            </div>
                            <span className="font-bold text-slate-200">{state.name}</span>
                          </div>
                          <button
                            onClick={() => setShowDeleteStateConfirm(state.id)}
                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={18} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl"
              >
                <div className="p-8 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">User Management</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage team members and their access levels.</p>
                  </div>
                  <button
                    onClick={() => setIsUserModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                  >
                    <UserPlus size={18} />
                    Add User
                  </button>
                </div>
                <div className="p-8">
                  <div className="space-y-3">
                    {users.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl hover:bg-slate-800 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 font-bold border border-slate-700">
                            {u.name[0]}
                          </div>
                          <div>
                            <p className="font-bold text-white">{u.name}</p>
                            <p className="text-xs text-slate-500">{u.email} • {u.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditUser(u)}
                            className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Edit2 size={18} />
                          </button>
                          {u.id !== currentUser?.id && (
                            <button
                              onClick={() => setShowDeleteUserConfirm(u.id)}
                              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'defaults' && (
              <motion.div
                key="defaults"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl"
              >
                <div className="p-8 border-b border-slate-800 bg-slate-800/30">
                  <h2 className="text-xl font-bold text-white">ERP Defaults & Customization</h2>
                  <p className="text-sm text-slate-500 mt-1">Set global defaults for financial calculations and project categorization.</p>
                </div>
                <form onSubmit={handleSaveSettings} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Default GST Rate (%)</label>
                      <div className="relative">
                        <select
                          value={settings.defaultGstRate || 18}
                          onChange={(e) => setSettings({ ...settings, defaultGstRate: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold appearance-none cursor-pointer"
                        >
                          {GST_RATES.map(rate => (
                            <option key={rate} value={rate}>{rate}%</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Default Margin (%)</label>
                      <input
                        type="number"
                        value={settings.defaultMargin || 0}
                        onChange={(e) => setSettings({ ...settings, defaultMargin: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Currency Symbol</label>
                      <input
                        type="text"
                        value={settings.currencySymbol || '₹'}
                        onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                        placeholder="₹"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Project Categories (Comma separated)</label>
                      <textarea
                        value={settings.projectCategories || ''}
                        onChange={(e) => setSettings({ ...settings, projectCategories: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold min-h-[100px]"
                        placeholder="Residential, Commercial, Industrial"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end pt-4">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-black transition-all flex items-center gap-2 shadow-xl shadow-indigo-500/20"
                    >
                      {isSaving ? 'Saving...' : (
                        <>
                          <Save size={20} />
                          Save Defaults
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'email' && (
              <motion.div
                key="email"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl"
              >
                <div className="p-8 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Email Configuration</h2>
                    <p className="text-sm text-slate-500 mt-1">Configure your SMTP settings for automated notifications.</p>
                  </div>
                  <div className={cn(
                    "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border",
                    emailConfig?.configured 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  )}>
                    <div className={cn("w-2 h-2 rounded-full", emailConfig?.configured ? "bg-emerald-400 animate-pulse" : "bg-rose-400")} />
                    {emailConfig?.configured ? "Active" : "Not Configured"}
                  </div>
                </div>
                
                <div className="p-8 space-y-8">
                  <form onSubmit={handleSaveSettings} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">SMTP Host</label>
                        <input
                          type="text"
                          value={settings.smtpHost || ''}
                          onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                          placeholder="smtp.gmail.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">SMTP Port</label>
                        <input
                          type="number"
                          value={settings.smtpPort || ''}
                          onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                          placeholder="587"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">SMTP User</label>
                        <input
                          type="text"
                          value={settings.smtpUser || ''}
                          onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                          placeholder="user@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">SMTP Password</label>
                        <div className="relative">
                          <input
                            type="password"
                            value={settings.smtpPass || ''}
                            onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                            placeholder="••••••••"
                          />
                          <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">From Email Address</label>
                        <input
                          type="email"
                          value={settings.smtpFrom || ''}
                          onChange={(e) => setSettings({ ...settings, smtpFrom: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                          placeholder="noreply@yourcompany.com"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={async () => {
                            setIsTestingEmail(true);
                            try {
                              const res = await fetch('/api/test-email', { method: 'POST' });
                              if (res.ok) {
                                setSuccess('Test email sent successfully!');
                                fetchEmailLogs();
                                setTimeout(() => setSuccess(null), 5000);
                              } else {
                                const data = await res.json();
                                setError(data.details || data.error || 'Failed to send test email');
                                fetchEmailLogs();
                              }
                            } catch (e) {
                              setError('Network error during test');
                            } finally {
                              setIsTestingEmail(false);
                            }
                          }}
                          disabled={isTestingEmail || !emailConfig?.configured}
                          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 border border-slate-700"
                        >
                          {isTestingEmail ? 'Testing...' : (
                            <>
                              <Mail size={18} />
                              Send Test Email
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            setIsVerifyingSmtp(true);
                            try {
                              const res = await fetch('/api/verify-smtp', { method: 'POST' });
                              const data = await res.json();
                              if (res.ok) {
                                setSuccess(data.message);
                                setTimeout(() => setSuccess(null), 5000);
                              } else {
                                setError(data.details || data.error || 'Verification failed');
                              }
                            } catch (e) {
                              setError('Network error during verification');
                            } finally {
                              setIsVerifyingSmtp(false);
                            }
                          }}
                          disabled={isVerifyingSmtp || !emailConfig?.configured}
                          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 border border-slate-700"
                        >
                          {isVerifyingSmtp ? 'Verifying...' : (
                            <>
                              <ShieldCheck size={18} />
                              Verify Connection
                            </>
                          )}
                        </button>
                      </div>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-black transition-all flex items-center gap-2 shadow-xl shadow-indigo-500/20"
                      >
                        {isSaving ? 'Saving...' : (
                          <>
                            <Save size={20} />
                            Save Email Settings
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  <div className="p-6 bg-indigo-500/5 rounded-3xl border border-indigo-500/10">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                        <AlertCircle size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-indigo-400">SMTP Configuration Guide</p>
                        <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                          For Gmail, use <code className="text-indigo-300">smtp.gmail.com</code> with port <code className="text-indigo-300">587</code>. 
                          You must use an <strong>App Password</strong> if you have 2FA enabled. 
                          Settings saved here will override environment variables.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-slate-500">
                          <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Vendor Onboarding</span>
                          <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> PO Notifications</span>
                          <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Payment Receipts</span>
                          <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Client Approvals</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                          <History size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">Email Delivery Logs</h3>
                          <p className="text-sm text-slate-500">Recent email activity and status</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={fetchEmailLogs}
                          disabled={isFetchingLogs}
                          className="p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                        >
                          <RefreshCcw size={18} className={cn(isFetchingLogs && "animate-spin")} />
                        </button>
                        <button
                          onClick={() => setShowClearLogsConfirm(true)}
                          className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
                        >
                          Clear Logs
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-800/50 rounded-[2rem] border border-slate-700/50 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-700/50">
                              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Recipient</th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Subject</th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/30">
                            {emailLogs.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                                  No email logs found
                                </td>
                              </tr>
                            ) : (
                              emailLogs.map((log) => (
                                <tr 
                                  key={log.id} 
                                  className="hover:bg-slate-700/20 transition-colors group cursor-pointer"
                                  onClick={() => setSelectedLog(log)}
                                >
                                  <td className="px-6 py-4">
                                    <div className="text-sm font-bold text-slate-200">{log.to}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-sm text-slate-400 truncate max-w-[200px]">{log.subject}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className={cn(
                                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                      log.status === 'Success' 
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    )}>
                                      {log.status === 'Success' ? <Check size={10} /> : <AlertTriangle size={10} />}
                                      {log.status}
                                    </div>
                                    {log.error && (
                                      <div className="text-[10px] text-rose-500/70 mt-1 max-w-[200px] truncate" title={log.error}>
                                        {log.error}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                      <Clock size={12} />
                                      {new Date(log.createdAt).toLocaleString()}
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FileText size={20} className="text-indigo-400" />
              Quick Help
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">PO Numbering</p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  The PO number is generated as <code className="text-indigo-300 font-bold">Prefix-00X</code>. 
                  Changing the next number will affect only future POs.
                </p>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">GST & PAN</p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Ensure these are correct as they are legally required on all Purchase Orders and Invoices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Email Details</h2>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Sent to: {selectedLog.to}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-500 hover:text-white transition-colors">
                <X size={28} />
              </button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Subject</label>
                <div className="text-lg font-bold text-white">{selectedLog.subject}</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Content</label>
                <div className="bg-white rounded-2xl p-6 overflow-hidden">
                  <div dangerouslySetInnerHTML={{ __html: selectedLog.body }} />
                </div>
              </div>
              {selectedLog.error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                  <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest block mb-2">Error Message</label>
                  <div className="text-sm text-rose-400 font-mono break-all">{selectedLog.error}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-2xl font-black text-white tracking-tight">{editingUser ? 'Edit Team Member' : 'Add Team Member'}</h2>
              <button onClick={() => { setIsUserModalOpen(false); setEditingUser(null); }} className="text-slate-500 hover:text-white transition-colors">
                <X size={28} />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Full Name</label>
                <div className="relative">
                  <UserCog className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                    placeholder="john@subtleinfra.com"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Access Password {editingUser && '(Leave blank to keep current)'}</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                    placeholder="••••••••"
                    required={!editingUser}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Access Role</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold appearance-none cursor-pointer"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsUserModalOpen(false); setEditingUser(null); }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl transition-all border border-slate-700 uppercase tracking-widest text-[10px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest text-[10px]"
                >
                  {editingUser ? 'Update Access' : 'Grant Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!showDeleteUserConfirm}
        onClose={() => setShowDeleteUserConfirm(null)}
        onConfirm={() => showDeleteUserConfirm && handleDeleteUser(showDeleteUserConfirm)}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete User"
        isLoading={isDeleting}
        variant="danger"
      />

      <ConfirmationModal
        isOpen={showClearLogsConfirm}
        onClose={() => setShowClearLogsConfirm(false)}
        onConfirm={async () => {
          setIsDeleting(true);
          await fetch('/api/email-logs', { method: 'DELETE' });
          fetchEmailLogs();
          setIsDeleting(false);
          setShowClearLogsConfirm(false);
        }}
        title="Clear Email Logs"
        message="Are you sure you want to clear all email delivery logs? This action cannot be undone."
        confirmText="Clear Logs"
        isLoading={isDeleting}
        variant="danger"
      />

      <ConfirmationModal
        isOpen={!!showDeleteStateConfirm}
        onClose={() => setShowDeleteStateConfirm(null)}
        onConfirm={() => showDeleteStateConfirm && handleDeleteState(showDeleteStateConfirm)}
        title="Delete State"
        message="Are you sure you want to delete this state? This may affect regional rate management."
        confirmText="Delete State"
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
}

