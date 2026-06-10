import { Brain, Database, Network, Search } from "lucide-react";

const features = [
  {
    title: "Semantic Search",
    description: "Find similar tickets using embeddings instead of exact keyword matching.",
    icon: Search,
  },
  {
    title: "Vector Similarity",
    description: "Retrieve the most relevant duplicate candidates from previous tickets.",
    icon: Network,
  },
  {
    title: "LLM Verification",
    description: "Validate whether candidate tickets are truly duplicates.",
    icon: Brain,
  },
  {
    title: "SQLite Repository",
    description: "Search through previously stored ticket records efficiently.",
    icon: Database,
  },
];

export function Features() {
  return (
    <div id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">
            Why Use Smart Ticket Deduplicator?
          </h2>
          <p className="text-lg text-slate-600">
            Stop wasting support agents' time on resolving the same issues multiple times. 
            Our intelligent system catches duplicates before they enter your workflow.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:border-blue-100 hover:bg-blue-50/50 transition-colors"
              >
                <div className="bg-white border border-slate-200 w-12 h-12 rounded-xl flex items-center justify-center text-blue-600 mb-6 shadow-sm">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
