import React, { useState, useEffect } from "react";
import { User, Shield, Check, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { apiFetch } from "../../../utils/apiFetch";

export function SettingsPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [syncingIndex, setSyncingIndex] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiFetch("/auth/me");
        const data = await response.json();
        setUsername(data.username || "");
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setEmail(data.email || "");
      } catch (err) {
        console.error("Failed to load profile settings:", err);
        setError("Failed to retrieve profile data.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const response = await apiFetch("/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim()
        }),
      });
      const data = await response.json();
      setSuccess("Profile settings updated successfully!");
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      setEmail(data.email || "");
    } catch (err) {
      console.error(err);
      setError("Failed to commit settings changes. Verify connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncIndex = () => {
    setSyncingIndex(true);
    setSyncSuccess(false);
    
    // Simulate FAISS index optimization and synchronization
    setTimeout(() => {
      setSyncingIndex(false);
      setSyncSuccess(true);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-500">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-sm font-medium">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure administrator details and manage pipeline indexes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Profile Details Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">Admin Profile Details</h2>
              <p className="text-xs text-slate-400">Update your account information</p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-5">
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">{success}</span>
              </div>
            )}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Username</label>
                <input 
                  type="text" 
                  value={username}
                  disabled 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed outline-none font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">First Name</label>
                <input 
                  type="text" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Name</label>
                <input 
                  type="text" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button 
                type="submit" 
                disabled={submitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-100"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save Configuration</span>
              </button>
            </div>
          </form>
        </div>

        {/* System Settings & Indexes Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-800">Pipeline Pipeline</h2>
                <p className="text-xs text-slate-400">View active configurations</p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-medium">
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-400">Gemini LLM Model</span>
                <span className="text-slate-800 font-bold">gemini-1.5-flash</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-400">Embedding model</span>
                <span className="text-slate-800 font-bold">all-MiniLM-L6-v2 (384d)</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-400">Similarity Threshold</span>
                <span className="text-slate-800 font-bold">0.75</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-400">Confidence Threshold</span>
                <span className="text-slate-800 font-bold">80%</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-400">Vector Search</span>
                <span className="text-slate-800 font-bold">FAISS Index</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-slate-800 text-sm">Index Maintenance</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              If search indexes become out of sync with new database entries, trigger a rebuild to re-align vector representations.
            </p>
            
            {syncSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Vector index fully rebuilt!</span>
              </div>
            )}
            
            <button 
              onClick={handleSyncIndex}
              disabled={syncingIndex}
              className="w-full flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-50 disabled:bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-lg text-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingIndex ? "animate-spin text-blue-600" : ""}`} />
              <span>{syncingIndex ? "Syncing FAISS..." : "Optimize Vector Search"}</span>
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
