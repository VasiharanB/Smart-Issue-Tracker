import React from 'react';
import { Navbar } from '../components/Navbar';
import { SubmissionForm } from '../components/SubmissionForm';
import { Footer } from '../components/Footer';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <Navbar />
      <main>
        <SubmissionForm />
      </main>
      <Footer />
    </div>
  );
}
