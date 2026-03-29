import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageTransition } from '../components/ui/PageTransition';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FileText, TrendingUp, AlertTriangle, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight, ArrowUpCircle, ArrowDownCircle, CreditCard, HelpCircle, X, ExternalLink, BookOpen, MessageSquare, ShieldCheck, Zap, Plus, Users, LayoutDashboard } from 'lucide-react';
import { formatCurrency, formatPercent, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useSettingsStore } from '../store/settingsStore';

const StatCard = ({ title, value, icon: Icon, trend, color, description, delay = 0 }: any) => (
  <Card delay={delay} className="p-8 group">
    <div className="flex items-start justify-between mb-10">
      <motion.div 
        whileHover={{ rotate: 5, scale: 1.1 }}
        className={cn("p-4 rounded-2xl shadow-2xl transition-transform duration-700", color)}
      >
        <Icon size={24} className="text-white" />
      </motion.div>
      {trend !== undefined && (
        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: delay + 0.5 }}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase backdrop-blur-md",
            trend > 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          )}
        >
          {trend > 0 ? <ArrowUpRight size={12} strokeWidth={3} /> : <ArrowDownRight size={12} strokeWidth={3} />}
          {Math.abs(trend).toFixed(1)}%
        </motion.div>
      )}
    </div>
    
    <div className="space-y-1">
      <h3 className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mb-3">{title}</h3>
      <div className="overflow-hidden">
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: delay + 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl font-light text-white tracking-tight tabular-nums leading-none"
        >
          {value}
        </motion.p>
      </div>
      {description && (
        <p className="text-[10px] text-white/20 mt-4 font-medium uppercase tracking-widest leading-relaxed max-w-[80%] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          {description}
        </p>
      )}
    </div>
  </Card>
);

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentBOQs, setRecentBOQs] = useState<any[]>([]);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const { erpSettings, fetchSettings } = useSettingsStore();
  const currencySymbol = erpSettings?.currencySymbol || '₹';

  useEffect(() => {
    fetchSettings();
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard/stats');
        const statsData = await res.json();
        
        if (statsData && !statsData.error) {
          setRecentBOQs(statsData.recentBOQs || []);
          setStats({
            totalValue: statsData.totalPipelineValue,
            avgMargin: statsData.avgMargin,
            pendingApprovals: statsData.pendingApprovals,
            approvedValue: statsData.approvedValue,
            totalPOValue: statsData.totalPOValue,
            itemCount: statsData.itemCount,
            vendorCount: statsData.vendorCount,
            poCount: statsData.poCount,
            pendingInvoices: statsData.pendingInvoices,
            totalInflow: statsData.totalInflow,
            totalOutflow: statsData.totalOutflow,
            overallProgress: statsData.overallProgress,
            trends: statsData.trends
          });
        }
      } catch (e) {
        console.error("Failed to fetch dashboard data", e);
      }
    };
    fetchData();
  }, []);

  return (
    <PageTransition>
      <div className="relative min-h-screen bg-[#050505] text-white overflow-hidden pb-24">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 space-y-20">
        {/* Header Section - Split Editorial Layout */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-12">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="h-[1px] w-12 bg-indigo-500" />
              <span className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.5em]">System Intelligence v2.4</span>
              {stats?.emailConfigured !== undefined && (
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase",
                  stats.emailConfigured ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                )}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", stats.emailConfigured ? "bg-emerald-400 animate-pulse" : "bg-rose-400")} />
                  Email {stats.emailConfigured ? "Active" : "Offline"}
                </div>
              )}
            </div>
            <h1 className="text-[60px] md:text-[80px] lg:text-[120px] font-black leading-[0.85] tracking-tighter mb-10">
              CORE <br />
              <span className="text-indigo-500 italic serif font-light">STRATEGY</span>
            </h1>
            <div className="flex flex-wrap gap-4">
              <Link to="/boqs?new=true">
                <Button icon={<Plus size={18} />}>New Project</Button>
              </Link>
              <Link to="/vendors">
                <Button variant="secondary" icon={<Users size={18} />}>Manage Vendors</Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full animate-pulse" />
            <div className="relative bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 overflow-hidden group">
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Global Execution Progress</h3>
                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-[10px] font-black">
                  {Math.round(stats?.overallProgress || 0)}%
                </div>
              </div>
              
              <div className="relative flex items-center justify-center py-10">
                <svg className="w-64 h-64 transform -rotate-90">
                  <circle
                    cx="128"
                    cy="128"
                    r="110"
                    stroke="currentColor"
                    strokeWidth="1"
                    fill="transparent"
                    className="text-white/5"
                  />
                  <motion.circle
                    initial={{ strokeDashoffset: 691 }}
                    animate={{ strokeDashoffset: 691 - (691 * (stats?.overallProgress || 0)) / 100 }}
                    transition={{ 
                      duration: 2.5, 
                      delay: 0.5,
                      ease: [0.16, 1, 0.3, 1] 
                    }}
                    cx="128"
                    cy="128"
                    r="110"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={691}
                    className="text-indigo-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 1, ease: "easeOut" }}
                    className="text-8xl font-black tracking-tighter tabular-nums"
                  >
                    {Math.round(stats?.overallProgress || 0)}
                  </motion.span>
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.2 }}
                    transition={{ delay: 1.5 }}
                    className="text-[10px] font-black text-white uppercase tracking-[0.3em] mt-2"
                  >
                    Percent Complete
                  </motion.span>
                </div>
              </div>

              <div className="mt-12 grid grid-cols-2 gap-8">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Active Pipelines</p>
                  <p className="text-2xl font-light">{recentBOQs.length}</p>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Vendor Reach</p>
                  <p className="text-2xl font-light">{stats?.vendorCount || 0}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Marquee Section */}
        <div className="relative py-10 border-y border-white/5 overflow-hidden">
          <motion.div 
            animate={{ x: [0, -1000] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="flex whitespace-nowrap gap-20 items-center"
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-20">
                <span className="text-[10px] font-black uppercase tracking-[1em] text-white/20">THE SUBTLE INFRA</span>
                <span className="text-[10px] font-black uppercase tracking-[1em] text-indigo-500">PRECISION EXECUTION</span>
                <span className="text-[10px] font-black uppercase tracking-[1em] text-white/20">DATA DRIVEN MARGINS</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Financial Grid */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Financial Performance</h2>
            <div className="h-[1px] flex-1 mx-10 bg-white/5" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Pipeline Value" 
              value={formatCurrency(stats?.totalValue || 0, currencySymbol)} 
              icon={TrendingUp} 
              trend={stats?.trends?.pipelineValue}
              color="bg-indigo-600"
              delay={0.1}
              description="Total projected revenue across all active BOQs"
            />
            <StatCard 
              title="Total Inflow" 
              value={formatCurrency(stats?.totalInflow || 0, currencySymbol)} 
              icon={ArrowUpCircle} 
              trend={stats?.trends?.inflow}
              color="bg-emerald-600"
              delay={0.2}
              description="Total payments received from clients"
            />
            <StatCard 
              title="Total Outflow" 
              value={formatCurrency(stats?.totalOutflow || 0, currencySymbol)} 
              icon={ArrowDownCircle} 
              trend={stats?.trends?.outflow}
              color="bg-rose-600"
              delay={0.3}
              description="Total payments made to vendors and suppliers"
            />
            <StatCard 
              title="Net Liquidity" 
              value={formatCurrency((stats?.totalInflow || 0) - (stats?.totalOutflow || 0), currencySymbol)} 
              icon={CreditCard} 
              color="bg-blue-600"
              delay={0.4}
              description="Available working capital in current cycle"
            />
          </div>
        </section>

        {/* Operational Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Recent Activity</h2>
              <Link to="/boqs" className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-400 transition-colors">Full Pipeline →</Link>
            </div>
            
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-white/20 text-[9px] uppercase tracking-[0.3em] font-black">
                      <th className="px-10 py-6">Project</th>
                      <th className="px-6 py-6">Status</th>
                      <th className="px-6 py-6 text-right">Value</th>
                      <th className="px-6 py-6 text-right">Margin</th>
                      <th className="px-10 py-6">Lead</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(recentBOQs || []).map((boq, i) => (
                      <motion.tr 
                        key={boq.id}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                      >
                        <td className="px-10 py-8">
                          <Link to={`/boqs/${boq.id}`} className="block">
                            <p className="text-sm font-medium group-hover:text-indigo-400 transition-colors">{boq.name}</p>
                            <p className="text-[9px] font-black text-white/10 uppercase tracking-widest mt-1">ID: {boq.id.slice(0, 8)}</p>
                          </Link>
                        </td>
                        <td className="px-6 py-8">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                            boq.status === 'Approved' ? "bg-emerald-500/10 text-emerald-400" :
                            boq.status === 'Pending Approval' ? "bg-amber-500/10 text-amber-400" :
                            "bg-white/5 text-white/40"
                          )}>
                            {boq.status}
                          </span>
                        </td>
                        <td className="px-6 py-8 text-right font-light text-sm">{formatCurrency(boq.totalValue, currencySymbol)}</td>
                        <td className="px-6 py-8 text-right">
                          <span className={cn(
                            "text-xs font-black",
                            boq.totalMargin < 15 ? "text-rose-500" : "text-emerald-500"
                          )}>
                            {formatPercent(boq.totalMargin)}
                          </span>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-indigo-500">
                              {boq.createdBy.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
                              {boq.createdBy.name.split(' ')[0]}
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Alerts & Docs</h2>
            </div>

            <Card className="p-8">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-8 flex items-center gap-3">
                <AlertTriangle size={14} className="text-rose-500" />
                Critical Margins
              </h3>
              <div className="space-y-4">
                {(recentBOQs || []).filter(b => b.totalMargin < 15).map(b => (
                  <div key={b.id} className="p-6 bg-rose-500/[0.02] border border-rose-500/10 rounded-3xl group hover:border-rose-500/30 transition-all">
                    <p className="text-sm font-medium mb-1">{b.name}</p>
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{formatPercent(b.totalMargin)} Margin</p>
                  </div>
                ))}
                {(recentBOQs || []).filter(b => b.totalMargin < 15).length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle2 size={32} className="text-emerald-500/20 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">All Margins Healthy</p>
                  </div>
                )}
              </div>
            </Card>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-indigo-600 rounded-[2.5rem] p-10 relative overflow-hidden group cursor-pointer"
              onClick={() => setIsHelpModalOpen(true)}
            >
              <div className="relative z-10">
                <h3 className="text-3xl font-black tracking-tighter mb-4">KNOWLEDGE <br />BASE</h3>
                <p className="text-indigo-100/60 text-sm font-light leading-relaxed mb-8">
                  Access enterprise protocols and advanced BOQ strategies.
                </p>
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em]">
                  Read Docs <ArrowUpRight size={14} />
                </div>
              </div>
              <FileText size={160} className="absolute -bottom-10 -right-10 text-white/10 group-hover:scale-110 transition-transform duration-700" />
            </motion.div>
          </div>
        </section>
      </div>

      {/* Help Modal */}
      <AnimatePresence>
        {isHelpModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHelpModalOpen(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-[#0A0A0A] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-12 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-black tracking-tighter">DOCUMENTATION</h2>
                  <p className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Enterprise Knowledge Base v1.0</p>
                </div>
                <button onClick={() => setIsHelpModalOpen(false)} className="p-4 hover:bg-white/5 rounded-2xl transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-12 max-h-[60vh] overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Core Protocols</h3>
                  {[
                    { title: "BOQ Strategy", desc: "Advanced margin tracking and line-item optimization." },
                    { title: "Vendor Relations", desc: "Automated rate collection and performance metrics." },
                    { title: "Financial Flow", desc: "Real-time liquidity monitoring and PTS tracking." }
                  ].map((item, i) => (
                    <div key={i} className="p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-all">
                      <h4 className="font-black text-sm uppercase tracking-widest mb-2">{item.title}</h4>
                      <p className="text-xs text-white/40 font-light leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">System Support</h3>
                  <div className="p-8 bg-indigo-600/10 border border-indigo-500/20 rounded-[2rem]">
                    <p className="text-sm font-light leading-relaxed text-white/60 mb-6">
                      For technical escalation or infrastructure support, please contact the THE SUBTLE INFRA systems department.
                    </p>
                    <button className="w-full py-4 bg-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em]">Contact Support</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </PageTransition>
  );
}
