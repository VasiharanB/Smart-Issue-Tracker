import { ArrowRight, Bot, Database, Search, Send } from "lucide-react";

const steps = [
  {
    title: "Submit Ticket",
    icon: Send,
    color: "bg-indigo-50 text-indigo-600 border-indigo-200",
  },
  {
    title: "Embedding Search",
    icon: Search,
    color: "bg-blue-50 text-blue-600 border-blue-200",
  },
  {
    title: "Top 3 Matches",
    icon: Database,
    color: "bg-purple-50 text-purple-600 border-purple-200",
  },
  {
    title: "LLM Verification",
    icon: Bot,
    color: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
];

export function HowItWorks() {
  return (
    <div id="how-it-works" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-16">
          How It Works
        </h2>

        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 relative max-w-5xl mx-auto">
          {/* Connector Line for Desktop */}
          <div className="hidden md:block absolute top-1/2 left-16 right-16 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="flex flex-col items-center relative z-10 w-full md:w-auto">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border-2 mb-4 bg-white shadow-sm ${step.color}`}>
                  <Icon className="w-8 h-8" />
                </div>
                <div className="bg-white px-4 py-2">
                  <h4 className="font-semibold text-slate-900 text-sm whitespace-nowrap">
                    {step.title}
                  </h4>
                </div>
                {index < steps.length - 1 && (
                  <div className="md:hidden text-slate-300 my-4">
                    <ArrowRight className="w-6 h-6 rotate-90" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
