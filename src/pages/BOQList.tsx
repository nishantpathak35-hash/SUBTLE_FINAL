import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageTransition } from '../components/ui/PageTransition';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { Plus, Search, Filter, MoreVertical, FileText, TrendingUp, Clock, CheckCircle2, AlertCircle, LayoutGrid, List, Briefcase, DollarSign, Percent, ArrowUpRight, ChevronRight, Trash2, AlertTriangle, PackageOpen, X } from 'lucide-react';
import { formatCurrency, formatPercent, cn } from '../lib/utils';
import { useSettingsStore } from '../store/settingsStore';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const StatCard = ({ label, value, icon: Icon, trend, color, index }: any) => {
  const colors: any = {
    indigo: "from-indigo-500/20 to-indigo-500/5 text-indigo-400 border-indigo-500/20",
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-400/20",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20",
    rose: "from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "relative overflow-hidden p-6 rounded-[2rem] border bg-gradient-to-br backdrop-blur-xl group transition-all hover:scale-[1.02]",
        colors[color]
      )}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform">
            <Icon size={24} />
          </div>
          {trend && (
            <span className="flex items-center gap-1 text-[10px] font-black bg-white/10 px-2 py-1 rounded-full">
              <ArrowUpRight size={12} />
              {trend}
            </span>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-black tracking-tighter text-white">{value}</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">{label}</p>
        </div>
      </div>
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-125 transition-transform duration-700">
        <Icon size={120} strokeWidth={4} />
      </div>
    </motion.div>
  );
};

export default function BOQList() {
  const { erpSettings, fetchSettings } = useSettingsStore();
  const currencySymbol = erpSettings?.currencySymbol || '₹';
  const [searchParams] = useSearchParams();
  const [boqs, setBoqs] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [availableStates, setAvailableStates] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('new') === 'true');
  const [newBoq, setNewBoq] = useState({ name: '', clientId: '', projectId: '', state: '', category: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchBOQs = async () => {
    try {
      const [boqRes, clientRes, statesRes, projectsRes] = await Promise.all([
        fetch('/api/boqs'),
        fetch('/api/clients'),
        fetch('/api/states'),
        fetch('/api/projects')
      ]);
      
      if (boqRes.ok) {
        const boqData = await boqRes.json();
        if (Array.isArray(boqData)) {
          setBoqs(boqData);
        } else {
          console.error("BOQ data is not an array:", boqData);
          setBoqs([]);
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

      if (projectsRes.ok) {
        const projectData = await projectsRes.json();
        if (Array.isArray(projectData)) {
          setProjects(projectData);
        } else {
          setProjects([]);
        }
      }
      
      if (statesRes.ok) {
        const statesData = await statesRes.json();
        if (Array.isArray(statesData)) {
          setAvailableStates(statesData);
          if (statesData.length > 0 && !newBoq.state) {
            setNewBoq(prev => ({ ...prev, state: statesData[0].name }));
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch BOQ list data", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/boqs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Project deleted successfully');
        setDeleteConfirmId(null);
        fetchBOQs();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete project');
      }
    } catch (e) {
      toast.error('An unexpected error occurred');
      console.error("Failed to delete BOQ", e);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchBOQs();
  }, []);

  useEffect(() => {
    if (erpSettings?.projectCategories && erpSettings.projectCategories.length > 0 && !newBoq.category) {
      setNewBoq(prev => ({ ...prev, category: erpSettings.projectCategories[0] }));
    }
  }, [erpSettings]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;
    
    if (!newBoq.name || !newBoq.clientId || !newBoq.state || !newBoq.category) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/boqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBoq),
      });
      
      if (res.ok) {
        toast.success('Project created successfully');
        setIsModalOpen(false);
        setNewBoq({ 
          name: '', 
          clientId: '', 
          projectId: '',
          state: availableStates[0]?.name || '', 
          category: erpSettings?.projectCategories?.[0] || 'Residential' 
        });
        fetchBOQs();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create BOQ');
      }
    } catch (e) {
      toast.error('An unexpected error occurred');
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredBoqs = boqs.filter(boq => {
    const matchesSearch = boq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      boq.client?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || boq.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || boq.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const summary = {
    total: boqs.length,
    pending: boqs.filter(b => b.status === 'Pending Approval').length,
    approved: boqs.filter(b => b.status === 'Approved').length,
    totalValue: boqs.reduce((sum, b) => sum + b.totalValue, 0),
    totalCost: boqs.reduce((sum, b) => sum + b.totalCost, 0),
    avgMargin: boqs.length ? boqs.reduce((sum, b) => sum + b.totalMargin, 0) / boqs.length : 0,
    activeProjects: boqs.filter(b => b.status !== 'Rejected').length
  };

  return (
    <PageTransition>
      <div className="relative min-h-screen pb-20 px-4 md:px-8">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/5 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/5 rounded-full blur-[160px] animate-pulse" style={{ animationDelay: '3s' }} />
        <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] bg-purple-500/5 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto pt-12">
        {/* Header Section */}
        <header className="relative z-10 mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <LayoutGrid className="text-white" size={24} />
                </div>
                <div className="h-px w-12 bg-slate-800" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">Project Pipeline</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none">
                Estimate <span className="text-indigo-500 italic">Studio</span>
              </h1>
              <p className="text-slate-500 mt-4 max-w-md font-medium leading-relaxed">
                Manage your project estimates with precision and elegance. Track margins, costs, and client values in real-time.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4"
            >
              <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-slate-800/50 backdrop-blur-xl">
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-3 rounded-xl transition-all",
                    viewMode === 'list' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-500 hover:text-white"
                  )}
                >
                  <List size={20} />
                </button>
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-3 rounded-xl transition-all",
                    viewMode === 'grid' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-500 hover:text-white"
                  )}
                >
                  <LayoutGrid size={20} />
                </button>
              </div>
              
              <button
                onClick={() => setIsModalOpen(true)}
                className="group relative px-8 py-4 bg-white text-black font-black rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/5"
              >
                <div className="absolute inset-0 bg-indigo-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative z-10 flex items-center gap-2 group-hover:text-white transition-colors">
                  <Plus size={20} strokeWidth={3} />
                  New Project
                </span>
              </button>
            </motion.div>
          </div>
        </header>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard 
            label="Total Pipeline" 
            value={formatCurrency(summary.totalValue, currencySymbol)} 
            icon={TrendingUp}
            trend="+12.5%"
            color="indigo"
            index={0}
          />
          <StatCard 
            label="Avg. Margin" 
            value={formatPercent(summary.avgMargin)} 
            icon={Percent}
            trend="+2.1%"
            color="emerald"
            index={1}
          />
          <StatCard 
            label="Active Projects" 
            value={summary.activeProjects.toString()} 
            icon={Briefcase}
            color="amber"
            index={2}
          />
          <StatCard 
            label="Total Cost" 
            value={formatCurrency(summary.totalCost, currencySymbol)} 
            icon={DollarSign}
            color="rose"
            index={3}
          />
        </div>

        <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center gap-6">
            <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Search projects, clients, or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600 font-bold"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-2">
                <Filter size={16} className="text-slate-500" />
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-sm text-slate-300 focus:outline-none font-bold cursor-pointer"
                >
                  <option value="All" className="bg-slate-900">All Status</option>
                  <option value="Draft" className="bg-slate-900">Draft</option>
                  <option value="Pending Approval" className="bg-slate-900">Pending</option>
                  <option value="Approved" className="bg-slate-900">Approved</option>
                  <option value="Rejected" className="bg-slate-900">Rejected</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-2">
                <Briefcase size={16} className="text-slate-500" />
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-sm text-slate-300 focus:outline-none font-bold cursor-pointer"
                >
                  <option value="All" className="bg-slate-900">All Categories</option>
                  {(erpSettings?.projectCategories || []).map(cat => (
                    <option key={cat} value={cat} className="bg-slate-900">{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {filteredBoqs.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-[#0A0A0A] border border-white/5 rounded-[3rem] p-20 text-center"
              >
                <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-500 mx-auto mb-8">
                  <PackageOpen size={48} />
                </div>
                <h3 className="text-3xl font-black text-white tracking-tighter mb-4">No Projects Found</h3>
                <p className="text-slate-500 max-w-md mx-auto font-medium leading-relaxed mb-10">
                  Start by creating your first project estimation pipeline.
                </p>
                <Button 
                  onClick={() => setIsModalOpen(true)}
                  icon={<Plus size={18} />}
                >
                  Create Project
                </Button>
              </motion.div>
            ) : viewMode === 'list' ? (
              <motion.div 
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0"
              >
                <table className="w-full text-left min-w-[800px] md:min-w-0">
                  <thead>
                    <tr className="bg-white/[0.02] text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black">
                      <th className="px-8 py-5">Project Details</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5 text-right">Total Cost</th>
                      <th className="px-8 py-5 text-right">Client Value</th>
                      <th className="px-8 py-5 text-center">Margin</th>
                      <th className="px-8 py-5">Created By</th>
                      <th className="px-8 py-5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(filteredBoqs || []).map((boq, i) => (
                      <motion.tr 
                        key={boq.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="hover:bg-indigo-500/[0.02] transition-colors group cursor-pointer"
                      >
                        <td className="px-8 py-6">
                          <Link to={`/boqs/${boq.id}`} className="block">
                            <span className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors tracking-tight">{boq.name}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-bold text-slate-500">{boq.client?.name}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-800" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500/60">{boq.category}</span>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex justify-center">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                              boq.status === 'Approved' ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" :
                              boq.status === 'Pending Approval' ? "bg-amber-400/10 text-amber-400 border-amber-400/20" :
                              boq.status === 'Rejected' ? "bg-rose-400/10 text-rose-400 border-rose-400/20" :
                              "bg-slate-400/10 text-slate-400 border-slate-400/20"
                            )}>
                              {boq.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right font-bold text-slate-400 tabular-nums">{formatCurrency(boq.totalCost, currencySymbol)}</td>
                        <td className="px-8 py-6 text-right font-black text-white text-lg tabular-nums">{formatCurrency(boq.totalValue, currencySymbol)}</td>
                        <td className="px-8 py-6 text-center">
                          <div className={cn(
                            "inline-block px-3 py-1 rounded-lg text-xs font-black tracking-tight",
                            boq.totalMargin < 15 ? "text-rose-400 bg-rose-400/10" : "text-emerald-400 bg-emerald-400/10"
                          )}>
                            {formatPercent(boq.totalMargin)}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-xs text-indigo-400 font-black border border-slate-700">
                              {boq.createdBy.name[0]}
                            </div>
                            <span className="text-xs font-bold text-slate-400">{boq.createdBy.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link 
                              to={`/boqs/${boq.id}`}
                              className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all"
                            >
                              <ChevronRight size={18} />
                            </Link>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDeleteConfirmId(boq.id);
                              }}
                              className="p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            ) : (
              <motion.div 
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {(filteredBoqs || []).map((boq, i) => (
                  <motion.div
                    key={boq.id}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ y: -5 }}
                    className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 hover:border-indigo-500/50 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        boq.status === 'Approved' ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" :
                        boq.status === 'Pending Approval' ? "bg-amber-400/10 text-amber-400 border-amber-400/20" :
                        "bg-slate-400/10 text-slate-400 border-slate-400/20"
                      )}>
                        {boq.status}
                      </span>
                    </div>
                    <Link to={`/boqs/${boq.id}`} className="block space-y-6">
                      <div>
                        <h3 className="text-2xl font-black text-white group-hover:text-indigo-400 transition-colors line-clamp-1 tracking-tight">{boq.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs font-bold text-slate-500">{boq.client?.name || 'No Client'}</p>
                          {boq.project && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-700" />
                              <p className="text-xs font-bold text-indigo-400/80">{boq.project.name}</p>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/5">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Value</p>
                          <p className="text-xl font-black text-white tabular-nums tracking-tighter">{formatCurrency(boq.totalValue, currencySymbol)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Margin</p>
                          <p className={cn(
                            "text-xl font-black tabular-nums tracking-tighter",
                            boq.totalMargin < 15 ? "text-rose-400" : "text-emerald-400"
                          )}>{formatPercent(boq.totalMargin)}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-6">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="secondary"
                            size="sm"
                            className="rounded-xl font-bold tracking-widest bg-white/5 border-white/5 hover:bg-indigo-600 hover:border-indigo-500 transition-all duration-500"
                          >
                            View Details
                          </Button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeleteConfirmId(boq.id);
                            }}
                            className="p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <span className="text-[10px] font-black text-indigo-500/70 uppercase tracking-widest">{boq.category}</span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden"
            >
              <div className="p-10 border-b border-white/5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Briefcase size={24} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">New Project</h2>
                    <p className="text-slate-500 font-medium">Initialize a new estimation pipeline.</p>
                  </div>
                </div>
              </div>
              <form onSubmit={handleCreate} className="p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Project Name</label>
                    <input
                      type="text"
                      value={newBoq.name || ''}
                      onChange={(e) => setNewBoq({ ...newBoq, name: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-700 font-bold"
                      placeholder="e.g. Skyline Tower"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Client</label>
                    <select
                      value={newBoq.clientId || ''}
                      onChange={(e) => {
                        const clientId = e.target.value;
                        setNewBoq({ ...newBoq, clientId, projectId: '' });
                      }}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-bold appearance-none"
                      required
                    >
                      <option value="" className="bg-slate-900">Select Client</option>
                      {(clients || []).map(client => (
                        <option key={client.id} value={client.id} className="bg-slate-900">{client.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Project (Optional)</label>
                    <select
                      value={newBoq.projectId || ''}
                      onChange={(e) => setNewBoq({ ...newBoq, projectId: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-bold appearance-none"
                    >
                      <option value="" className="bg-slate-900">Select Project</option>
                      {(projects || [])
                        .filter(p => !newBoq.clientId || p.clientId === newBoq.clientId)
                        .map(project => (
                        <option key={project.id} value={project.id} className="bg-slate-900">{project.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Category</label>
                    <select
                      value={newBoq.category || ''}
                      onChange={(e) => setNewBoq({ ...newBoq, category: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-bold appearance-none"
                      required
                    >
                      {(erpSettings?.projectCategories || []).map((c: string) => (
                        <option key={c} value={c} className="bg-slate-900">{c}</option>
                      )) || <option value="Residential" className="bg-slate-900">Residential</option>}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Region / State</label>
                    <select
                      value={newBoq.state || ''}
                      onChange={(e) => setNewBoq({ ...newBoq, state: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-bold appearance-none"
                      required
                    >
                      {(availableStates || []).map(s => (
                        <option key={s.id} value={s.name} className="bg-slate-900">{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isCreating}
                    className="flex-1"
                  >
                    Create Project
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone and all associated data will be permanently removed."
        confirmText="Delete Project"
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
    </PageTransition>
  );
}
