import React, { useState, useEffect } from "react";
import { Filter, Search, Loader2, X, AlertCircle, ArrowUpRight } from "lucide-react";
import { useSearchParams } from "react-router";
import { apiFetch } from "../../../utils/apiFetch";

export function TicketsPage() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("q") || "";

  // Data fetching states
  const [tickets, setTickets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter and search parameters
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Detail Modal / Slide-over states
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [overrideNotes, setOverrideNotes] = useState("");
  const [overrideParentCode, setOverrideParentCode] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Debounce search queries
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset page on search
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch categories for filtering dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiFetch("/categories");
        const data = await response.json();
        setCategories(data);
      } catch (err) {
        console.error("Failed to load categories filter list:", err);
      }
    };
    fetchCategories();
  }, []);

  // Main tickets fetch
  const fetchTickets = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        q: debouncedSearch,
        status: statusFilter,
        category: categoryFilter
      });
      console.log(`Fetching tickets listing with query params: ${params.toString()}`);
      const response = await apiFetch(`/tickets?${params.toString()}`);
      const data = await response.json();
      setTickets(data.results || []);
      setTotalCount(data.count || 0);
    } catch (err: any) {
      console.error("Failed to fetch tickets:", err);
      setError(err.message || "Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [debouncedSearch, statusFilter, categoryFilter, currentPage]);

  // Fetch specific ticket detail when selected
  const handleOpenDetail = async (ticket: any) => {
    setSelectedTicket(ticket); // Immediately set basic details for visual response
    setLoadingDetail(true);
    setDetailError("");
    setOverrideNotes("");
    setOverrideParentCode("");
    
    try {
      console.log(`Fetching ticket detail: ${ticket.ticket_code}`);
      const response = await apiFetch(`/tickets/${ticket.ticket_code}`);
      const detailedData = await response.json();
      setSelectedTicket(detailedData);
    } catch (err: any) {
      console.error(err);
      setDetailError(err.message || "Failed to load complete ticket audit logs.");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Perform backend status override
  const handleStatusOverride = async (newStatus: "UNIQUE" | "DUPLICATE") => {
    if (!selectedTicket) return;
    setIsUpdatingStatus(true);
    setDetailError("");

    try {
      console.log(`Sending manual status override to backend for Ticket ID: ${selectedTicket.id}`);
      const response = await apiFetch(`/admin/ticket/${selectedTicket.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          notes: overrideNotes.trim(),
          parent_ticket_code: newStatus === "DUPLICATE" ? overrideParentCode.trim() : undefined
        }),
      });

      const data = await response.json();
      console.log("Status updated successfully:", data);
      // Refresh detail view
      setSelectedTicket(data);
      setOverrideNotes("");
      setOverrideParentCode("");
      // Refresh grid list
      fetchTickets();
    } catch (err: any) {
      console.error("Status override failed:", err);
      setDetailError("Failed to commit override. Please verify the master ticket code is correct.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const totalPages = Math.ceil(totalCount / 10) || 1;

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Previous Tickets</h1>
          <p className="text-sm text-slate-500 mt-1">View, inspect, and manually manage ingested tickets.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 md:items-center justify-between bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by ID, subject, name..." 
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
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'}`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none"
              >
                <option value="">All Statuses</option>
                <option value="UNIQUE">Unique (Master)</option>
                <option value="DUPLICATE">Duplicate</option>
                <option value="PENDING_REVIEW">Pending Review</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Table Area */}
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="text-sm font-medium">Loading ticket index...</span>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-600">
            <p className="font-semibold">{error}</p>
            <button onClick={fetchTickets} className="mt-4 text-sm font-semibold text-blue-600 hover:underline">
              Retry Load
            </button>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="font-semibold">No tickets found matching the search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Ticket ID</th>
                  <th className="p-4">Title</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {tickets.map((ticket) => (
                  <tr 
                    key={ticket.id} 
                    onClick={() => handleOpenDetail(ticket)}
                    className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                  >
                    <td className="p-4 font-semibold text-blue-600 flex items-center gap-1.5">
                      <span>{ticket.ticket_code}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                    <td className="p-4 text-slate-800 font-medium max-w-xs truncate" title={ticket.subject}>
                      {ticket.subject}
                    </td>
                    <td className="p-4 text-slate-600 font-medium">{ticket.category_name}</td>
                    <td className="p-4">
                      {ticket.status === "DUPLICATE" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                          Duplicate
                        </span>
                      ) : ticket.status === "UNIQUE" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Unique
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                          Review
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-400 font-medium">
                      {new Date(ticket.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {!loading && !error && tickets.length > 0 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500 bg-slate-50/50">
            <span>Showing page <b>{currentPage}</b> of <b>{totalPages}</b> (Total Entries: {totalCount})</span>
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

      {/* Ticket Detail slide-over panel */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedTicket(null)} />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200">
              
              {/* Slide-over Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ticket Profile</span>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>{selectedTicket.ticket_code}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      selectedTicket.status === 'DUPLICATE' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-50 text-emerald-800'
                    }`}>
                      {selectedTicket.status}
                    </span>
                  </h2>
                </div>
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Slide-over Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {loadingDetail ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="text-xs font-medium">Fetching history logs...</span>
                  </div>
                ) : (
                  <>
                    {detailError && (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{detailError}</span>
                      </div>
                    )}

                    {/* Metadata Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Reporter Name</p>
                        <p className="font-semibold text-slate-900">{selectedTicket.first_name} {selectedTicket.last_name}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Created At</p>
                        <p className="font-semibold text-slate-900">{new Date(selectedTicket.created_at).toLocaleString()}</p>
                      </div>
                      <div className="col-span-2 border-t border-slate-200 pt-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Subject</p>
                        <p className="font-bold text-slate-900 leading-snug">{selectedTicket.subject}</p>
                      </div>
                      <div className="col-span-2 border-t border-slate-200 pt-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
                        <p className="text-slate-700 leading-relaxed bg-white p-3 border border-slate-100 rounded-xl max-h-48 overflow-y-auto whitespace-pre-wrap">
                          {selectedTicket.description}
                        </p>
                      </div>
                    </div>

                    {/* Duplicate References Info */}
                    {selectedTicket.status === 'DUPLICATE' && (
                      <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex flex-col gap-2">
                        <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Duplicate Association</h4>
                        <p className="text-sm text-blue-900 leading-normal">
                          This ticket is classified as a duplicate. It points to the master Ticket: <b>{selectedTicket.parent_ticket_code}</b>.
                        </p>
                      </div>
                    )}

                    {/* Sub-tickets mapping */}
                    {selectedTicket.duplicates && selectedTicket.duplicates.length > 0 && (
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Linked Duplicate Reports</h4>
                        <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-white">
                          {selectedTicket.duplicates.map((dup: any) => (
                            <div key={dup.id} className="p-3.5 flex justify-between items-center text-xs">
                              <div>
                                <span className="font-bold text-blue-600 block">{dup.ticket_code}</span>
                                <span className="text-slate-500 font-medium">{dup.subject}</span>
                              </div>
                              <span className="text-slate-400">{new Date(dup.created_at).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Manual Status Override Options */}
                    <div className="border-t border-slate-200 pt-6 space-y-4">
                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Administrative Overrides</h4>
                      
                      {selectedTicket.status === 'DUPLICATE' ? (
                        <div className="space-y-4 bg-slate-50/50 p-4 border border-slate-200 rounded-2xl">
                          <p className="text-xs text-slate-500">
                            If this ticket is actually an independent issue, you can break the duplicate link and classify it as a unique ticket.
                          </p>
                          <textarea
                            placeholder="Add reason for manually marking as Unique..."
                            value={overrideNotes}
                            onChange={(e) => setOverrideNotes(e.target.value)}
                            rows={2}
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-xs outline-none bg-white focus:border-blue-500"
                          />
                          <button
                            onClick={() => handleStatusOverride("UNIQUE")}
                            disabled={isUpdatingStatus}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            {isUpdatingStatus && <Loader2 className="w-3 h-3 animate-spin" />}
                            <span>Break Link (Mark as Unique)</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4 bg-slate-50/50 p-4 border border-slate-200 rounded-2xl">
                          <p className="text-xs text-slate-500">
                            If this ticket is a duplicate of an existing master ticket, you can manually link it by providing the master ticket code (e.g. T-8001).
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="Master Ticket Code (e.g. T-8001)"
                              value={overrideParentCode}
                              onChange={(e) => setOverrideParentCode(e.target.value)}
                              className="px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none bg-white focus:border-blue-500"
                            />
                            <textarea
                              placeholder="Add reason for classification..."
                              value={overrideNotes}
                              onChange={(e) => setOverrideNotes(e.target.value)}
                              rows={2}
                              className="col-span-2 p-2.5 border border-slate-300 rounded-lg text-xs outline-none bg-white focus:border-blue-500"
                            />
                          </div>
                          <button
                            onClick={() => handleStatusOverride("DUPLICATE")}
                            disabled={isUpdatingStatus}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            {isUpdatingStatus && <Loader2 className="w-3 h-3 animate-spin" />}
                            <span>Link as Duplicate</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Historical logs */}
                    {selectedTicket.history_logs && selectedTicket.history_logs.length > 0 && (
                      <div className="space-y-4 border-t border-slate-200 pt-6">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Audit Trail</h4>
                        <div className="flow-root">
                          <ul className="-mb-8">
                            {selectedTicket.history_logs.map((log: any, logIdx: number) => (
                              <li key={log.id}>
                                <div className="relative pb-8">
                                  {logIdx !== selectedTicket.history_logs.length - 1 ? (
                                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                                  ) : null}
                                  <div className="relative flex space-x-3">
                                    <div>
                                      <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-500 font-semibold text-xs">
                                        {log.action[0]}
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                                      <div>
                                        <p className="text-xs text-slate-700">
                                          <b>{log.action}</b>: {log.notes}
                                        </p>
                                        {log.actor_username && (
                                          <span className="text-[10px] text-slate-400 block mt-0.5">By supporter: @{log.actor_username}</span>
                                        )}
                                      </div>
                                      <div className="text-right text-[10px] whitespace-nowrap text-slate-400 font-medium">
                                        {new Date(log.created_at).toLocaleDateString()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
