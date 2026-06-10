import React, { useState, useEffect } from "react";
import { CreditCard, HardDrive, Key, Mail, Package, Shield, Settings, Plus, X, Loader2, AlertCircle } from "lucide-react";

const iconMap: Record<string, any> = {
  Key: Key,
  CreditCard: CreditCard,
  Mail: Mail,
  Shield: Shield,
  HardDrive: HardDrive,
  Package: Package,
};

export function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  // Form states
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("Key");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchCategories = async () => {
    setLoading(true);
    setError("");
    try {
      console.log("Fetching dynamic categories list...");
      const response = await fetch("/api/categories");
      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }
      const data = await response.json();
      setCategories(data);
    } catch (err: any) {
      console.error("Failed to load categories:", err);
      setError(err.message || "Failed to load categories list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAdd = () => {
    setCatName("");
    setCatIcon("Key");
    setFormError("");
    setIsAddOpen(true);
  };

  const handleOpenEdit = (category: any) => {
    setSelectedCategory(category);
    setCatName(category.name);
    setCatIcon(category.icon_name || "Key");
    setFormError("");
    setIsEditOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!catName.trim()) {
      setFormError("Category name is required.");
      return;
    }

    setSubmitting(true);
    try {
      console.log("Creating category:", catName);
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName.trim(), icon_name: catIcon }),
        credentials: "include"
      });
      const data = await response.json();
      if (response.ok) {
        setIsAddOpen(false);
        fetchCategories();
      } else {
        setFormError(data.name ? `Error: ${data.name.join(", ")}` : "Failed to create category.");
      }
    } catch (err) {
      console.error(err);
      setFormError("Could not connect to backend server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!selectedCategory) return;
    if (!catName.trim()) {
      setFormError("Category name is required.");
      return;
    }

    setSubmitting(true);
    try {
      console.log("Updating category ID:", selectedCategory.id);
      const response = await fetch(`/api/categories/${selectedCategory.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName.trim(), icon_name: catIcon }),
        credentials: "include"
      });
      const data = await response.json();
      if (response.ok) {
        setIsEditOpen(false);
        fetchCategories();
      } else {
        setFormError(data.name ? `Error: ${data.name.join(", ")}` : "Failed to update category.");
      }
    } catch (err) {
      console.error(err);
      setFormError("Could not connect to backend server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    if (!window.confirm(`Are you sure you want to delete category "${selectedCategory.name}"?`)) {
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      console.log("Deleting category ID:", selectedCategory.id);
      const response = await fetch(`/api/categories/${selectedCategory.id}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (response.ok) {
        setIsEditOpen(false);
        fetchCategories();
      } else {
        const text = await response.text();
        let errorMsg = "Failed to delete category.";
        try {
          const parsed = JSON.parse(text);
          errorMsg = parsed.detail || parsed.error || errorMsg;
        } catch {
          if (text.includes("ProtectedError") || response.status === 500) {
            errorMsg = "Cannot delete category as there are tickets associated with it.";
          }
        }
        setFormError(errorMsg);
      }
    } catch (err) {
      console.error(err);
      setFormError("Could not connect to backend server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage ticket categories and view duplication metrics.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-blue-200 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-500">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-sm font-medium">Loading categories metrics...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl font-medium">
          <h3 className="font-bold mb-2">Error Loading Categories</h3>
          <p className="text-sm">{error}</p>
          <button onClick={fetchCategories} className="mt-4 text-sm font-bold text-blue-600 hover:underline">
            Retry Load
          </button>
        </div>
      ) : categories.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <p className="font-semibold">No categories registered in the database.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const Icon = iconMap[category.icon_name] || Settings;
            const dupePercentage = category.duplication_rate;
            
            return (
              <div key={category.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-600">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-slate-900">{category.name}</h3>
                  </div>
                  <button 
                    onClick={() => handleOpenEdit(category)}
                    className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Total Tickets</p>
                    <p className="font-semibold text-slate-900">{category.ticket_count.toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-600 mb-1">Duplicates</p>
                    <p className="font-semibold text-blue-900">{category.duplicate_count.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Duplication Rate</span>
                  <span className="font-medium text-slate-900">{dupePercentage}%</span>
                </div>
                <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full" 
                    style={{ width: `${dupePercentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !submitting && setIsAddOpen(false)} />
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl relative z-10 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">Add New Category</h3>
              <button onClick={() => setIsAddOpen(false)} disabled={submitting} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Category Name</label>
                <input 
                  type="text" 
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Billing Queries" 
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Icon Identifier</label>
                <select 
                  value={catIcon}
                  onChange={(e) => setCatIcon(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none"
                  disabled={submitting}
                >
                  <option value="Key">Key (Auth)</option>
                  <option value="CreditCard">CreditCard (Payments)</option>
                  <option value="Mail">Mail (Email)</option>
                  <option value="Shield">Shield (Accounts)</option>
                  <option value="HardDrive">HardDrive (System)</option>
                  <option value="Package">Package (Orders)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsAddOpen(false)} 
                  disabled={submitting}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Delete Modal */}
      {isEditOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !submitting && setIsEditOpen(false)} />
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl relative z-10 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">Edit Category Details</h3>
              <button onClick={() => setIsEditOpen(false)} disabled={submitting} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Category Name</label>
                <input 
                  type="text" 
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Billing Queries" 
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Icon Identifier</label>
                <select 
                  value={catIcon}
                  onChange={(e) => setCatIcon(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none"
                  disabled={submitting}
                >
                  <option value="Key">Key (Auth)</option>
                  <option value="CreditCard">CreditCard (Payments)</option>
                  <option value="Mail">Mail (Email)</option>
                  <option value="Shield">Shield (Accounts)</option>
                  <option value="HardDrive">HardDrive (System)</option>
                  <option value="Package">Package (Orders)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button 
                  type="button" 
                  onClick={handleDelete}
                  disabled={submitting}
                  className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg text-sm font-semibold transition-colors"
                >
                  Delete Category
                </button>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setIsEditOpen(false)} 
                    disabled={submitting}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
