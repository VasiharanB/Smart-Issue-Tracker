import { ArrowRight, Bot, CheckCircle2, Copy, FileText, Search, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-50 rounded-full blur-3xl opacity-50 -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Copy */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Hello, Mr. User 👋</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-6">
              Detect Duplicate Support Tickets Before They Reach Your Queue
            </h1>
            
            <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl">
              AI-powered duplicate ticket detection using semantic embeddings, vector similarity search, and LLM verification.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="inline-flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-sm shadow-blue-200">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
              <button className="inline-flex justify-center items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-xl font-medium transition-all">
                Learn More
              </button>
            </div>
          </div>

          {/* Right Column: Illustration */}
          <div className="relative h-[400px] sm:h-[500px] w-full max-w-lg mx-auto lg:max-w-none">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-100/40 to-slate-50/40 rounded-3xl border border-white/60 shadow-2xl shadow-slate-200/50" />
            
            {/* Background Blob */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
            
            {/* Cards wrapper */}
            <div className="absolute inset-0 p-6 flex items-center justify-center">
              <div className="relative w-full h-full">
                
                {/* Incoming Ticket Card */}
                <div className="absolute top-4 left-4 right-20 bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-slate-100 z-10 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-orange-100 p-1.5 rounded-lg text-orange-600">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New Ticket #892</span>
                    </div>
                    <span className="text-xs text-slate-400">Just now</span>
                  </div>
                  <div className="h-2.5 w-3/4 bg-slate-200 rounded-full mb-2" />
                  <div className="h-2 w-full bg-slate-100 rounded-full mb-2" />
                  <div className="h-2 w-2/3 bg-slate-100 rounded-full" />
                </div>

                {/* Processing/AI Card */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 bg-blue-600/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-blue-500 z-20 flex flex-col items-center text-center">
                  <div className="bg-white/20 p-3 rounded-full mb-3">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-white text-sm font-medium mb-1">AI Verification</div>
                  <div className="flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>

                {/* Existing Duplicate Card */}
                <div className="absolute bottom-8 left-16 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-slate-100 z-10 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-slate-100 p-1.5 rounded-lg text-slate-600">
                        <Copy className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Existing Ticket #745</span>
                    </div>
                    <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-md text-xs font-medium border border-green-100">
                      <CheckCircle2 className="w-3 h-3" />
                      98% Match
                    </div>
                  </div>
                  <div className="h-2.5 w-3/4 bg-slate-200 rounded-full mb-2" />
                  <div className="h-2 w-full bg-slate-100 rounded-full mb-2" />
                  <div className="h-2 w-4/5 bg-slate-100 rounded-full" />
                </div>

                {/* Similarity Score Connection */}
                <div className="absolute top-[40%] right-10 bg-white/80 backdrop-blur p-2 rounded-xl shadow-md border border-slate-100 flex items-center gap-2 z-30">
                  <Search className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold text-slate-700">Vector Search</span>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
