import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Package, Users, LogOut, ChevronRight, Plus, AlertCircle, CheckCircle2, Clock, ShoppingCart, ShieldCheck, Building2, CreditCard, Settings as SettingsIcon, ArrowUpCircle, ArrowDownCircle, BarChart3, Briefcase, UserCircle, IndianRupee } from 'lucide-react';
import { Toaster } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from './store/authStore';
import { cn } from './lib/utils';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BOQList from './pages/BOQList';
import BOQDetail from './pages/BOQDetail';
import ItemMaster from './pages/ItemMaster';
import Vendors from './pages/Vendors';
import VendorSubmission from './pages/VendorSubmission';
import VendorSetup from './pages/VendorSetup';
import PurchaseOrders from './pages/PurchaseOrders';
import Landing from './pages/Landing';
import Settings from './pages/Settings';
import VendorPortal from './pages/VendorPortal';
import UserManagement from './pages/UserManagement';
import Clients from './pages/Clients';
import CashFlow from './pages/CashFlow';
import PaymentTracking from './pages/PaymentTracking';
import Projects from './pages/Projects';
import Logo from './components/Logo';

const SidebarItem = ({ to, icon: Icon, label, active }: { to: string; icon: any; label: string; active?: boolean }) => (
  <Link
    to={to}
    className={cn(
      "relative flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-500 rounded-xl overflow-hidden group",
      active 
        ? "text-white" 
        : "text-slate-400 hover:text-white"
    )}
  >
    {active && (
      <motion.div
        layoutId="sidebar-active"
        className="absolute inset-0 bg-indigo-600 shadow-lg shadow-indigo-500/20"
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      />
    )}
    
    {!active && (
      <motion.div
        initial={false}
        whileHover={{ opacity: 1, scale: 1 }}
        animate={{ opacity: 0, scale: 0.95 }}
        className="absolute inset-0 bg-white/5 opacity-0 transition-opacity duration-300"
      />
    )}

    <Icon 
      size={18} 
      strokeWidth={active ? 2.5 : 2} 
      className={cn("relative z-10 transition-transform duration-500 group-hover:scale-110", active ? "text-white" : "text-slate-500")}
    />
    <span className="relative z-10 tracking-wide font-black uppercase text-[10px]">{label}</span>
  </Link>
);

const MobileNavItem = ({ to, icon: Icon, label, active }: { to: string; icon: any; label: string; active?: boolean }) => (
  <Link
    to={to}
    className={cn(
      "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all duration-300",
      active ? "text-indigo-500" : "text-slate-500 hover:text-slate-300"
    )}
  >
    <div className={cn(
      "p-1.5 rounded-lg transition-all duration-300",
      active ? "bg-indigo-500/10" : "bg-transparent"
    )}>
      <Icon size={20} strokeWidth={active ? 2.5 : 2} />
    </div>
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </Link>
);

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    navigate('/login');
  };

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { to: "/projects", icon: Briefcase, label: "Projects" },
    { to: "/clients", icon: Building2, label: "Clients" },
    { to: "/boqs", icon: FileText, label: "BOQs" },
    { to: "/items", icon: Package, label: "Items" },
    { to: "/vendors", icon: Users, label: "Vendors" },
    { to: "/purchase-orders", icon: ShoppingCart, label: "Orders" },
    { to: "/payment-tracking", icon: BarChart3, label: "Payments" },
    { to: "/cash-flow", icon: CreditCard, label: "Cash" },
    { to: "/settings", icon: SettingsIcon, label: "Settings" },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-white/5 bg-[#0A0A0A] relative z-20">
        <div className="p-8 flex items-center gap-4">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <Logo size={24} />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase italic serif">SUBTLE<span className="text-indigo-500">INFRA</span></span>
        </div>

        <nav className="flex-1 px-6 space-y-1.5 py-4 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <SidebarItem key={item.to} {...item} />
          ))}
          {user?.role === 'Admin' && (
            <SidebarItem to="/users" icon={ShieldCheck} label="User Management" />
          )}
        </nav>

        <div className="p-6 border-t border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-4 mb-6 p-3 rounded-2xl bg-white/5 border border-white/5">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/20">
              {user?.name?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-widest truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-black uppercase tracking-widest text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all duration-300 rounded-xl border border-transparent hover:border-rose-500/20"
          >
            <LogOut size={18} strokeWidth={2.5} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5 z-40 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Logo size={24} />
          <span className="text-sm font-black tracking-tighter uppercase italic serif">SUBTLE<span className="text-indigo-500">INFRA</span></span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-black shadow-lg shadow-indigo-500/20">
            {user?.name?.[0].toUpperCase()}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative pt-16 lg:pt-0 pb-20 lg:pb-0">
        <header className="hidden lg:flex h-20 border-b border-white/5 items-center justify-between px-10 bg-[#0A0A0A]/30 backdrop-blur-md">
          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
            <span>Enterprise</span>
            <ChevronRight size={12} strokeWidth={3} />
            <span className="text-white">Management System</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Status</span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Operational</span>
              </div>
            </div>
            <div className="h-8 w-px bg-white/5" />
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 tabular-nums">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1600px] mx-auto p-6 lg:p-10">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-[#0A0A0A]/90 backdrop-blur-2xl border-t border-white/5 z-40 flex items-center justify-around px-2 pb-safe">
        <MobileNavItem to="/dashboard" icon={LayoutDashboard} label="Home" />
        <MobileNavItem to="/projects" icon={Briefcase} label="Projects" />
        <MobileNavItem to="/boqs" icon={FileText} label="BOQs" />
        <MobileNavItem to="/vendors" icon={Users} label="Vendors" />
        <MobileNavItem to="/cash-flow" icon={CreditCard} label="Cash" />
        <MobileNavItem to="/settings" icon={SettingsIcon} label="More" />
      </nav>
    </div>
  );
};

export default function App() {
  const { user, setUser, isLoading, setIsLoading } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (e) {
        console.error("Auth check failed");
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [setUser, setIsLoading]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors theme="dark" />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/vendor-submit/:token" element={<VendorSubmission />} />
        <Route path="/vendor-setup/:token" element={<VendorSetup />} />
        <Route path="/vendor-portal/:token" element={<VendorPortal />} />
        
        <Route
          path="/*"
          element={
            user ? (
              <MainLayout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/boqs" element={<BOQList />} />
                  <Route path="/boqs/:id" element={<BOQDetail />} />
                  <Route path="/items" element={<ItemMaster />} />
                  <Route path="/vendors" element={<Vendors />} />
                  <Route path="/purchase-orders" element={<PurchaseOrders />} />
                  <Route path="/payment-tracking" element={<PaymentTracking />} />
                  <Route path="/cash-flow" element={<CashFlow />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
              </MainLayout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
