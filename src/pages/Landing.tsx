import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Shield, Zap, BarChart3, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import Logo from '../components/Logo';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={40} />
            <span className="text-xl font-bold tracking-tight">SUBTLEINFRA</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
            <Link to="/login" className="bg-white text-slate-950 px-5 py-2.5 rounded-full hover:bg-slate-200 transition-all font-bold">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-emerald-600/10 blur-[100px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="max-w-4xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Logo size={80} className="mb-8" />
              <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">
                Next-Gen Infrastructure Management
              </span>
              <h1 className="text-6xl lg:text-8xl font-bold tracking-tight leading-[0.9] mb-8">
                Precision BOQ <br />
                <span className="text-slate-500 italic font-serif">Intelligence.</span>
              </h1>
              <p className="text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
                Streamline your procurement workflow with automated vendor rate intelligence, 
                AI-driven margin protection, and one-click purchase order generation.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login" className="group bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-full text-lg font-bold transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/25">
                  Get Started Now
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <a href="#features" className="px-8 py-4 rounded-full border border-white/10 hover:bg-white/5 text-lg font-bold transition-all text-center">
                  View Features
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold">Real-Time Rates</h3>
              <p className="text-slate-400 leading-relaxed">
                Automatically fetch and compare the latest vendor rates to ensure your BOQs are always competitive.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <Shield size={24} />
              </div>
              <h3 className="text-xl font-bold">Margin Protection</h3>
              <p className="text-slate-400 leading-relaxed">
                Intelligent alerts and automated calculations protect your project profitability at every stage.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                <BarChart3 size={24} />
              </div>
              <h3 className="text-xl font-bold">One-Click POs</h3>
              <p className="text-slate-400 leading-relaxed">
                Convert approved BOQs into professional Purchase Orders instantly, grouped by vendor.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-24 bg-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How it Works</h2>
            <p className="text-slate-400">A seamless bridge between estimators and vendors.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Onboard Vendors', desc: 'Send automated invites to your vendor network.' },
              { step: '02', title: 'Collect Rates', desc: 'Vendors submit rates for standard or custom items.' },
              { step: '03', title: 'Build BOQ', desc: 'System auto-selects lowest rates for maximum margin.' },
              { step: '04', title: 'Issue POs', desc: 'Generate and track purchase orders in one click.' }
            ].map((item, i) => (
              <div key={i} className="relative p-8 bg-slate-900 border border-white/5 rounded-3xl">
                <span className="text-4xl font-serif italic text-indigo-500/30 absolute top-4 right-6">{item.step}</span>
                <h4 className="text-lg font-bold mb-2 mt-4">{item.title}</h4>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <FileText size={20} />
            <span className="text-sm font-bold">SUBTLEINFRA</span>
          </div>
          <p className="text-slate-500 text-sm">
            © 2024 THE SUBTLEINFRA PVT LTD. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
