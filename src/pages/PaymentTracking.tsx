import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Download, 
  FileSpreadsheet, 
  File as FilePdf, 
  CreditCard, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Users,
  Briefcase
} from 'lucide-react';
import { formatCurrency, formatPercent, cn } from '../lib/utils';
import { useSettingsStore } from '../store/settingsStore';

interface PTSData {
  id: string;
  poNumber: string;
  project: string;
  projectId: string | null;
  boqId: string | null;
  client: string;
  clientId: string;
  vendor: string;
  vendorId: string;
  poValue: number;
  certifiedValue: number;
  amountPaid: number;
  paidPercent: number;
  balancePayment: number;
  tds: number;
  status: string;
}

export default function PaymentTracking() {
  const { erpSettings, fetchSettings } = useSettingsStore();
  const currencySymbol = erpSettings?.currencySymbol || '₹';
  const [data, setData] = useState<PTSData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('All');

  useEffect(() => {
    fetchSettings();
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/pts');
      const ptsData = await res.json();
      if (Array.isArray(ptsData)) {
        setData(ptsData);
      } else {
        console.error("PTS data is not an array:", ptsData);
        setData([]);
      }
    } catch (e) {
      console.error("Failed to fetch PTS data", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item => {
    const matchesSearch = 
      item.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.poNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProject = filterProject === 'All' || item.project === filterProject;
    
    return matchesSearch && matchesProject;
  });

  const projects = ['All', ...new Set(data.map(item => item.project))];

  const stats = {
    totalPOValue: filteredData.reduce((sum, item) => sum + item.poValue, 0),
    totalCertified: filteredData.reduce((sum, item) => sum + item.certifiedValue, 0),
    totalPaid: filteredData.reduce((sum, item) => sum + item.amountPaid, 0),
    totalBalance: filteredData.reduce((sum, item) => sum + item.balancePayment, 0),
    avgPaidPercent: filteredData.length > 0 
      ? filteredData.reduce((sum, item) => sum + item.paidPercent, 0) / filteredData.length 
      : 0
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Payment Tracking Sheet</h1>
          <p className="text-slate-400 mt-1">Real-time monitoring of P.O. values, certifications, and disbursements.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-700">
            <FileSpreadsheet size={18} />
            Export Excel
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20">
            <Download size={18} />
            Download PDF
          </button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Briefcase size={64} />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">Total P.O. Value</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalPOValue, currencySymbol)}</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-indigo-400">
            <TrendingUp size={14} />
            <span>Across {filteredData.length} active orders</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle2 size={64} />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">Total Certified</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.totalCertified, currencySymbol)}</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-500">
            <ArrowUpRight size={14} />
            <span>{formatPercent((stats.totalCertified / stats.totalPOValue) * 100 || 0)} of total P.O.</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CreditCard size={64} />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-indigo-400">{formatCurrency(stats.totalPaid, currencySymbol)}</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-indigo-400">
            <ArrowDownRight size={14} />
            <span>{formatPercent((stats.totalPaid / stats.totalPOValue) * 100 || 0)} disbursement rate</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock size={64} />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">Balance Outstanding</p>
          <p className="text-2xl font-bold text-rose-400">{formatCurrency(stats.totalBalance, currencySymbol)}</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-rose-500">
            <AlertCircle size={14} />
            <span>Pending vendor payments</span>
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Search by project, vendor, or P.O. #..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <select
                className="bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-8 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none transition-all"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
              >
                {projects.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing {filteredData.length} of {data.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800">Project & Client</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800">Vendor</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800">P.O. Details</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 text-right">P.O. Value</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 text-right">Certified</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 text-right">Paid Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800">Paid %</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 text-right">Balance</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 text-right">TDS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <Link 
                        to={item.boqId ? `/boqs/${item.boqId}` : `/projects`} 
                        className="text-sm font-bold text-white hover:text-indigo-400 flex items-center gap-1 group/link"
                      >
                        {item.project}
                        <ExternalLink size={12} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </Link>
                      <Link to={`/clients`} className="text-[10px] text-slate-500 flex items-center gap-1 hover:text-slate-300">
                        <Building2 size={10} />
                        {item.client}
                      </Link>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Link to={`/vendors`} className="flex items-center gap-2 text-sm text-slate-300 hover:text-indigo-400">
                      <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-[10px] font-bold text-indigo-400">
                        {item.vendor.charAt(0)}
                      </div>
                      {item.vendor}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <Link to="/purchase-orders" className="text-xs font-mono text-indigo-400 font-bold hover:underline">
                        #{item.poNumber}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter",
                          item.status === 'Received' ? "bg-emerald-400/10 text-emerald-400" : "bg-amber-400/10 text-amber-400"
                        )}>
                          {item.status}
                        </span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-800/50 px-1.5 py-0.5 rounded">
                          {Math.round(item.paidPercent)}% Paid
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-bold text-white">{formatCurrency(item.poValue, currencySymbol)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-medium text-emerald-400">{formatCurrency(item.certifiedValue, currencySymbol)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-medium text-indigo-400">{formatCurrency(item.amountPaid, currencySymbol)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden min-w-[60px]">
                        <div 
                          className={cn(
                            "h-full transition-all duration-1000",
                            item.paidPercent >= 100 ? "bg-emerald-500" : "bg-indigo-500"
                          )}
                          style={{ width: `${Math.min(item.paidPercent, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{Math.round(item.paidPercent)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "text-sm font-bold",
                      item.balancePayment > 0 ? "text-rose-400" : "text-slate-500"
                    )}>
                      {formatCurrency(item.balancePayment, currencySymbol)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xs text-slate-500">{formatCurrency(item.tds, currencySymbol)}</span>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <CreditCard size={48} className="opacity-20" />
                      <p>No payment records found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-800/30 font-bold border-t border-slate-700">
              <tr>
                <td colSpan={3} className="px-6 py-4 text-sm text-slate-300">Total Aggregated Value</td>
                <td className="px-6 py-4 text-right text-sm text-white">{formatCurrency(stats.totalPOValue, currencySymbol)}</td>
                <td className="px-6 py-4 text-right text-sm text-emerald-400">{formatCurrency(stats.totalCertified, currencySymbol)}</td>
                <td className="px-6 py-4 text-right text-sm text-indigo-400">{formatCurrency(stats.totalPaid, currencySymbol)}</td>
                <td className="px-6 py-4 text-sm text-slate-400">{Math.round(stats.avgPaidPercent)}% Avg.</td>
                <td className="px-6 py-4 text-right text-sm text-rose-400">{formatCurrency(stats.totalBalance, currencySymbol)}</td>
                <td className="px-6 py-4 text-right text-xs text-slate-500">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
