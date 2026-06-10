import { BrainCircuit, CheckCircle, Copy, Target } from "lucide-react";

const stats = [
  {
    value: "500+",
    label: "Tickets Processed",
    icon: Copy,
  },
  {
    value: "95%",
    label: "Detection Accuracy",
    icon: Target,
  },
  {
    value: "Top 3",
    label: "Candidate Matches",
    icon: BrainCircuit,
  },
  {
    value: "LLM",
    label: "Verified Results",
    icon: CheckCircle,
  },
];

export function Stats() {
  return (
    <div className="bg-slate-50 border-y border-slate-200 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={index} 
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center transition-transform hover:-translate-y-1 duration-300"
              >
                <div className="bg-blue-50 text-blue-600 p-3 rounded-xl mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-3xl font-bold text-slate-900 tracking-tight mb-1">
                  {stat.value}
                </div>
                <div className="text-sm font-medium text-slate-500">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
