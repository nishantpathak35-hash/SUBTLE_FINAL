import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Send, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { toast } from 'sonner';

export default function VendorSubmission() {
  const { token } = useParams();
  const [rateData, setRateData] = useState<any>(null);
  const [submittedRate, setSubmittedRate] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch(`/api/public/vendor-rate/${token}`);
        if (res.ok) {
          const data = await res.json();
          setRateData(data);
          setSubmittedRate(data.submittedRate?.toString() || '');
        }
      } catch (e) {
        console.error("Failed to fetch rate data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRate();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(submittedRate);
    if (isNaN(rate) || rate <= 0) {
      toast.error("Please enter a valid rate greater than 0");
      return;
    }
    const res = await fetch(`/api/public/vendor-rate/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submittedRate: rate }),
    });
    if (res.ok) {
      setIsSubmitted(true);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  );

  if (!rateData) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Invalid Link</h1>
        <p className="text-slate-400">This rate submission link is invalid or has expired.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20 mb-4">
            <FileText size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Rate Submission</h1>
          <p className="text-slate-400 mt-2">{rateData.vendor.name} • {rateData.vendor.state}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {isSubmitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Submission Received</h2>
              <p className="text-slate-400">Thank you for your rate submission. Our team will review it shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Item Details</h3>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-bold text-white">{rateData.item.name}</p>
                    <p className="text-xs text-slate-500">Category: {rateData.item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-300">Unit</p>
                    <p className="text-lg font-bold text-indigo-400">{rateData.item.unit}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Your Submitted Rate (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={submittedRate}
                  onChange={(e) => setSubmittedRate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-slate-500 mt-2">Please provide your most competitive rate for the specified unit.</p>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Send size={20} />
                Submit Rate
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
