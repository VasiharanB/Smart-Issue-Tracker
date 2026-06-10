import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Search, Filter, Loader2, Info, X } from "lucide-react";

export function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filter parameters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [verdictFilter, setVerdictFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Selected history log for reasoning modal
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        q: debouncedSearch,
        verdict: verdictFilter
      });
      console.log(`Fetching analysis history with parameters: ${params.toString()}`);
      const response = await fetch(`/api/admin/history?${params.toString()}`, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`Server returned error: ${response.status}`);
      }
      const data = await response.json();
      setHistory(data.results || []);
      setTotalCount(data.count || 0);
    } catch (err: any) {
      console.error("Failed to load analysis logs:", err);
      setError(err.message || "Failed to load duplicate analysis logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [debouncedSearch, verdictFilter, currentPage]);

  const totalPages = Math.ceil(totalCount / 10) || 1;

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Duplicate Analysis History</h1>
          <p className="text-sm text-slate-500 mt-1">Review matches, similarity index values, and LLM verification reasoning.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between bg-slate-50/50">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-sm w-full outline-none transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                Clear
              </button>
            )}
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'}`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <div className="space-y-1 max-w-xs">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">LLM Verdict</label>
              <select
                value={verdictFilter}
                onChange={(e) => { setVerdictFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none"
              >
                <option value="">All Verdicts</option>
                <option value="Confirmed">Confirmed Duplicate</option>
                <option value="Rejected">Rejected Duplicate</option>
              </select>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="text-sm font-medium">Loading analysis audits...</span>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-600">
            <p className="font-semibold">{error}</p>
            <button onClick={fetchHistory} className="mt-4 text-sm font-semibold text-blue-600 hover:underline">
              Retry Load
            </button>
          </div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="font-semibold">No duplication records generated yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">New Ticket</th>
                  <th className="p-4">Matched Ticket</th>
                  <th className="p-4">Similarity Score</th>
                  <th className="p-4">LLM Verdict</th>
                  <th className="p-4">Decision Flow</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Reasoning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-semibold text-slate-900">{row.newTicket}</td>
                    <td className="p-4 font-semibold text-slate-600">{row.matchedTicket || "-"}</td>
                    <td className="p-4">
                      {row.matchedTicket ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full" 
                              style={{ width: row.score }}
                            />
                          </div>
                          <span className="text-slate-700 font-semibold">{row.score}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {row.verdict === "Confirmed" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                          <XCircle className="w-3.5 h-3.5" />
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        row.decision_flow === 'Auto Duplicate (90%+)' 
                          ? 'bg-purple-50 text-purple-700 border-purple-100' 
                          : row.decision_flow === 'Gemini Verified'
                          ? 'bg-blue-50 text-blue-700 border-blue-100'
                          : row.decision_flow === 'Fallback Unique'
                          ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : 'bg-slate-50 text-slate-600 border-slate-100'
                      }`}>
                        {row.decision_flow || 'FAISS Only'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 font-medium">{row.date}</td>
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedLog(row)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="View LLM justification details"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {!loading && !error && history.length > 0 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500 bg-slate-50/50">
            <span>Showing page <b>{currentPage}</b> of <b>{totalPages}</b> (Total Audits: {totalCount})</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reasoning Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedLog(null)} />
          
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl relative z-10">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900">LLM Verification Decision</h3>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs font-medium border-b border-slate-100 pb-4">
                <div>
                  <span className="text-slate-400 block mb-0.5 uppercase tracking-wider">New Ingested Ticket</span>
                  <span className="text-slate-900 text-sm font-bold">{selectedLog.newTicket}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 uppercase tracking-wider">Matched Master Ticket</span>
                  <span className="text-slate-900 text-sm font-bold">{selectedLog.matchedTicket || "N/A"}</span>
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-2 uppercase tracking-wider">Verification Reasoning Justification</span>
                <p className="text-sm text-slate-700 bg-slate-50 p-4 border border-slate-100 rounded-xl leading-relaxed whitespace-pre-wrap">
                  {selectedLog.reasoning || "No detailed decision log description saved for this transaction."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
