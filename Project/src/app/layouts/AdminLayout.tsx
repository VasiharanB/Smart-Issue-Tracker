import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, Link } from "react-router";
import { 
  LayoutDashboard, 
  Ticket, 
  History, 
  Tags, 
  Settings, 
  LogOut, 
  Search,
  Bell,
  Layers,
  Lock,
  Loader2
} from "lucide-react";

export function AdminLayout() {
  const navigate = useNavigate();

  // Authentication & UI states
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [showNotif, setShowNotif] = useState(false);

  // Check auth status on load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        const data = await response.json();
        if (response.ok && data.username) {
          setUser(data);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth verification failed:", err);
        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!username.trim() || !password.trim()) {
      setLoginError("Please fill in both fields.");
      return;
    }

    setIsLoggingIn(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include"
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data);
      } else {
        setLoginError(data.error || "Authentication failed.");
      }
    } catch (err) {
      console.error("Login request failed:", err);
      setLoginError("Could not connect to the authentication server.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/auth/logout", { 
        method: "POST",
        credentials: "include"
      });
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      setUser(null);
      navigate("/");
    }
  };

  // Nav items configuration
  const navItems = [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/admin/tickets", icon: Ticket, label: "Previous Tickets" },
    { to: "/admin/history", icon: History, label: "Analysis History" },
    { to: "/admin/categories", icon: Tags, label: "Categories" },
    { to: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // If not logged in, render the secure admin login panel
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
        {/* Ambient background designs */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-md border border-slate-700/50 p-8 rounded-3xl shadow-2xl relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex bg-blue-600/15 p-3 rounded-2xl mb-4 border border-blue-500/10">
              <Layers className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Admin Console</h2>
            <p className="text-slate-400 text-sm mt-2">Enter credentials to manage duplicate checks</p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {loginError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl font-medium">
                {loginError}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="admin-username" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                id="admin-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm font-medium"
                disabled={isLoggingIn}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="admin-password" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                id="admin-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm font-medium"
                disabled={isLoggingIn}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 flex items-center justify-center gap-2"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Access Control</span>
                </>
              )}
            </button>

            <div className="text-center mt-4">
              <Link to="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                ← Return to Public Site
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // If authenticated, render full admin container
  const userInitials = (user.first_name?.[0] || "") + (user.last_name?.[0] || "AD");

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 z-10">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900 tracking-tight">Deduplicator</span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? "bg-blue-50 text-blue-700" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition-colors text-left"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-slate-800">
              Welcome Back, {user.first_name || user.username} <span className="text-xl">👋</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search tickets..." 
                className="pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg text-sm w-64 transition-all outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const query = (e.target as HTMLInputElement).value;
                    navigate(`/admin/tickets?q=${encodeURIComponent(query)}`);
                  }
                }}
              />
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setShowNotif(!showNotif)}
                className="text-slate-400 hover:text-slate-600 relative p-1 rounded-lg hover:bg-slate-100 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              {showNotif && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Alert Center</span>
                    <button onClick={() => setShowNotif(false)} className="text-slate-400 hover:text-slate-600 text-xs font-semibold">Clear</button>
                  </div>
                  <p className="text-xs text-slate-500 leading-normal py-2 text-center font-medium">
                    All AI pipeline nodes operational.<br/>No new alerts.
                  </p>
                </div>
              )}
            </div>
            
            <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm">
              {userInitials.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-x-hidden">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
