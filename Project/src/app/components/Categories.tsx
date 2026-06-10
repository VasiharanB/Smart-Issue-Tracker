import { CreditCard, HardDrive, Key, Mail, Package, Shield } from "lucide-react";

const categories = [
  { name: "Authentication", icon: Key },
  { name: "Payment Issues", icon: CreditCard },
  { name: "Email Problems", icon: Mail },
  { name: "Account Management", icon: Shield },
  { name: "System Errors", icon: HardDrive },
  { name: "Order Tracking", icon: Package },
];

export function Categories() {
  return (
    <div className="py-24 bg-slate-50 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-12">
          Supported Ticket Categories
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <div 
                key={index}
                className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center cursor-pointer"
              >
                <div className="text-slate-400 group-hover:text-blue-600 mb-4 transition-colors">
                  <Icon className="w-8 h-8" />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                  {category.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
