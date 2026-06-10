import React, { useState } from "react";
import { Layers, Menu, X } from "lucide-react";
import { Link } from "react-router";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-lg tracking-tight">
              Issue Tracker
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <Link to="/admin" className="text-sm font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors">
              Admin Login
            </Link>
          </div>

          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white/95 backdrop-blur-md px-4 py-4 space-y-3 flex flex-col shadow-lg">
          <Link 
            to="/admin" 
            onClick={() => setIsOpen(false)}
            className="text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 px-4 py-3 rounded-xl text-center border border-slate-100 transition-colors"
          >
            Admin Login
          </Link>
        </div>
      )}
    </nav>
  );
}
