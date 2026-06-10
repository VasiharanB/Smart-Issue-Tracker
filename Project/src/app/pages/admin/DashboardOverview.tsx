import React, { useState, useEffect } from "react";
import { ArrowRight, Brain, Copy, Target, Ticket, Loader2 } from "lucide-react";
import { Link } from "react-router";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function DashboardOverview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        console.log("Fetching admin dashboard analytics from backend...");
        const response = await fetch("/api/admin/dashboard", { credentials: "include" });
        if (!response.ok) {
          throw new Error(`Failed to load metrics. Server status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Dashboard analytics loaded:", data);
        setData(data);
      } catch (err: any) {
        console.error("Dashboard load failure:", err);
        setError(err.message || "Failed to load dashboard metrics.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl font-medium">
        <h3 className="font-bold mb-2">Error Loading Dashboard</h3>
        <p className="text-sm">{error || "No analytics data available. Verify backend is running and you are logged in."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Tickets" 
          value={data.total_tickets.value} 
          change={data.total_tickets.change_percent} 
          icon={Ticket} 
          color="blue" 
        />
        <StatCard 
          title="Duplicate Matches" 
          value={data.duplicate_matches.value} 
          change={data.duplicate_matches.change_percent} 
          icon={Copy} 
          color="indigo" 
        />
        <StatCard 
          title="Categories" 
          value={data.categories_count.value} 
          change={data.categories_count.change_percent} 
          icon={Target} 
          color="purple" 
        />
        <StatCard 
          title="Avg Similarity Score" 
          value={data.avg_similarity_score.value} 
          change={data.avg_similarity_score.change_percent} 
          icon={Brain} 
          color="emerald" 
        />
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-slate-800">Processing Volume (7 Days)</h2>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chart_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDuplicates" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '13px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="tickets" name="Total Tickets" stroke="#94a3b8" fillOpacity={1} fill="url(#colorTickets)" />
                <Area type="monotone" dataKey="duplicates" name="Duplicates" stroke="#2563eb" fillOpacity={1} fill="url(#colorDuplicates)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-slate-800">Recent Activity</h2>
            <Link to="/admin/history" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="flex-1 space-y-4">
            {data.recent_activity.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-12">No recent submission activity.</p>
            ) : (
              data.recent_activity.map((activity: any, index: number) => (
                <div key={index} className="flex flex-col gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">{activity.id}</span>
                    <span className="text-xs text-slate-400">{activity.time}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 truncate" title={activity.title}>
                    {activity.title}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    {activity.status === "Duplicate" ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Match: {activity.match}
                        </span>
                        <span className="text-xs font-medium text-emerald-600">{activity.score}</span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                        Unique
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}

function StatCard({ title, value, change, icon: Icon, color }: { title: string, value: string, change: string, icon: any, color: string }) {
  const colorStyles = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    purple: "bg-purple-50 text-purple-600",
    emerald: "bg-emerald-50 text-emerald-600",
  }[color] || "bg-slate-50 text-slate-600";

  const isPositive = change.startsWith("+");
  const changeColor = isPositive ? "text-emerald-600" : (change === "0%" ? "text-slate-500" : "text-red-600");

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        <p className={`text-xs font-medium mt-2 ${changeColor}`}>
          {change} <span className="text-slate-400 font-normal">vs last month</span>
        </p>
      </div>
      <div className={`p-3 rounded-xl ${colorStyles}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}
