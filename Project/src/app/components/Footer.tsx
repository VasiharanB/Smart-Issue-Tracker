import { Layers } from "lucide-react";
import { Link } from "react-router";

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1 rounded-md">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-slate-900 tracking-tight">
                Issue Tracker
              </span>
            </div>
            <p className="text-sm text-slate-500">
              AI-Powered Duplicate Ticket Detection
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm font-medium text-slate-500">
            <Link to="/admin" className="hover:text-slate-900 transition-colors">Admin Login</Link>
          </div>
          
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Issue Tracker. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-600 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
