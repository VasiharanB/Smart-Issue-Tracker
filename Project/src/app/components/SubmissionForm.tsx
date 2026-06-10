import React, { useState } from 'react';

export function SubmissionForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<any[]>([]);

  // Fetch categories dynamically on mount
  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories");
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (err) {
        console.error("Failed to load categories dropdown:", err);
      }
    };
    fetchCategories();
  }, []);

  // Status and notification states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = 'First name is required.';
    if (!lastName.trim()) errors.lastName = 'Last name is required.';
    if (!category) errors.category = 'Please select a ticket category.';
    if (!subject.trim()) errors.subject = 'Subject is required.';
    if (!description.trim()) errors.description = 'Issue description is required.';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Sending ticket data to Django backend...');
      const response = await fetch('/api/tickets/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          category_slug: category,
          subject: subject.trim(),
          description: description.trim(),
        }),
      });

      const data = await response.json();
      console.log('Response from Django:', data);

      if (response.ok) {
        // Success
        setSuccessMessage(`Ticket created successfully! Code: ${data.ticket_code}. Status: ${data.status}`);
        
        // Clear fields
        setFirstName('');
        setLastName('');
        setCategory('');
        setSubject('');
        setDescription('');
        setValidationErrors({});
      } else {
        // Handle backend errors
        if (data.error) {
          setErrorMessage(data.error);
        } else if (typeof data === 'object') {
          // Flatten standard DRF serializer field validation errors
          const fieldErrors = Object.entries(data)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ');
          setErrorMessage(fieldErrors || 'Submission failed. Please check your input.');
        } else {
          setErrorMessage('Submission failed. Please try again.');
        }
      }
    } catch (err) {
      console.error('Network or server error:', err);
      setErrorMessage('Could not connect to the backend server. Please verify Django is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-24 bg-slate-50 relative overflow-hidden" id="submission-form">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[120px] opacity-60 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-[120px] opacity-60 -translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-200 overflow-hidden mb-8">
          
          {/* Header */}
          <div className="p-8 md:p-12 border-b border-slate-100 bg-white">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Raise a Support Ticket
            </h2>
            <p className="text-slate-500 mt-3 text-base">
              Submit details about the issue you are experiencing.
            </p>
          </div>

          {/* Form */}
          <form className="p-8 md:p-12 space-y-8 bg-slate-50/30" onSubmit={handleSubmit}>
            
            {/* Feedback Alerts */}
            {successMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium">
                {successMessage}
              </div>
            )}
            {errorMessage && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm font-medium">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-2.5">
                <label htmlFor="firstName" className="block text-sm font-semibold text-slate-700">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={`w-full px-5 py-3.5 rounded-xl border ${validationErrors.firstName ? 'border-rose-400 focus:ring-rose-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'} focus:ring-4 outline-none transition-all text-slate-900 bg-white placeholder:text-slate-400 font-medium`}
                  placeholder="John"
                  disabled={isSubmitting}
                />
                {validationErrors.firstName && (
                  <p className="text-rose-600 text-xs mt-1 font-medium">{validationErrors.firstName}</p>
                )}
              </div>
              <div className="space-y-2.5">
                <label htmlFor="lastName" className="block text-sm font-semibold text-slate-700">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={`w-full px-5 py-3.5 rounded-xl border ${validationErrors.lastName ? 'border-rose-400 focus:ring-rose-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'} focus:ring-4 outline-none transition-all text-slate-900 bg-white placeholder:text-slate-400 font-medium`}
                  placeholder="Smith"
                  disabled={isSubmitting}
                />
                {validationErrors.lastName && (
                  <p className="text-rose-600 text-xs mt-1 font-medium">{validationErrors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              <label htmlFor="category" className="block text-sm font-semibold text-slate-700">
                Ticket Category
              </label>
              <div className="relative">
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`w-full px-5 py-3.5 rounded-xl border ${validationErrors.category ? 'border-rose-400 focus:ring-rose-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'} focus:ring-4 outline-none transition-all text-slate-900 bg-white appearance-none font-medium`}
                  disabled={isSubmitting}
                >
                  <option value="" disabled>Select a category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-slate-400">
                  <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
              {validationErrors.category && (
                <p className="text-rose-600 text-xs mt-1 font-medium">{validationErrors.category}</p>
              )}
            </div>

            <div className="space-y-2.5">
              <label htmlFor="subject" className="block text-sm font-semibold text-slate-700">
                Subject
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={`w-full px-5 py-3.5 rounded-xl border ${validationErrors.subject ? 'border-rose-400 focus:ring-rose-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'} focus:ring-4 outline-none transition-all text-slate-900 bg-white placeholder:text-slate-400 font-medium`}
                placeholder="Unable to login to account"
                disabled={isSubmitting}
              />
              {validationErrors.subject && (
                <p className="text-rose-600 text-xs mt-1 font-medium">{validationErrors.subject}</p>
              )}
            </div>

            <div className="space-y-2.5">
              <label htmlFor="description" className="block text-sm font-semibold text-slate-700">
                Issue Description
              </label>
              <textarea
                id="description"
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full px-5 py-3.5 rounded-xl border ${validationErrors.description ? 'border-rose-400 focus:ring-rose-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'} focus:ring-4 outline-none transition-all text-slate-900 bg-white placeholder:text-slate-400 font-medium resize-none`}
                placeholder="User receives authentication error while signing in."
                disabled={isSubmitting}
              />
              {validationErrors.description && (
                <p className="text-rose-600 text-xs mt-1 font-medium">{validationErrors.description}</p>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-4 px-8 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 duration-200"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
              </button>
            </div>

          </form>
        </div>

        {/* Informational Content Below Form */}
        <div className="mt-12 px-4 md:px-8 text-center md:text-left">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Why are support tickets necessary?</h3>
          <p className="text-slate-600 leading-relaxed mb-6">
            Support tickets provide our team with the exact context needed to investigate and resolve your issue. Instead of scattered emails or quick chats, a ticket centralizes all the information—logs, descriptions, and user details—into one secure location.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">AI-Powered Routing</h4>
                <p className="text-sm text-slate-500 mt-1">Our system automatically reviews submissions to identify common patterns, ensuring your request reaches the right specialist.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Faster Resolutions</h4>
                <p className="text-sm text-slate-500 mt-1">By gathering all requirements upfront, we eliminate back-and-forth communication, leading to significantly faster fix times.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
