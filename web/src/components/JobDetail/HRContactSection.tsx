import type { HRProspect } from '../../api/client';

interface HRContactSectionProps {
  companyName: string;
  isInternSG?: boolean;
  hrName?: string; // HR name from InternSG listings
  hrLoading: boolean;
  hrProspects: HRProspect[];
  hrFetched: boolean; // Track if we've attempted to fetch
  outreachLoading: boolean;
  onFindHR: () => void; // New: single button to trigger the fetch flow
  onSearchLinkedIn: () => void;
  onGenerateGenericOutreach: () => void;
  onGenerateOutreach: (prospect: HRProspect) => void;
  onCopyEmail: (email: string) => void;
  onViewAllContacts: () => void;
  selectedHRContact: HRProspect | null;
  outreachMessage: { subject: string; body: string } | null;
  onCopyOutreachMessage: () => void;
}

export default function HRContactSection({
  companyName,
  isInternSG,
  hrName,
  hrLoading,
  hrProspects,
  hrFetched,
  outreachLoading,
  onFindHR,
  onSearchLinkedIn,
  onGenerateGenericOutreach,
  onGenerateOutreach,
  onCopyEmail,
  onViewAllContacts,
  selectedHRContact,
  outreachMessage,
  onCopyOutreachMessage
}: HRContactSectionProps) {
  // For InternSG jobs, show HR name if available
  if (isInternSG) {
    if (!hrName) {
      return null; // No HR info available for this InternSG job
    }

    return (
      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">HR Contact</h3>
            <p className="text-sm text-slate-600 mt-1">
              Connect with the hiring contact for this position
            </p>
          </div>
        </div>

        {/* Show HR name from InternSG listing */}
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900">{hrName}</h4>
              <p className="text-sm text-slate-600 mt-1">{companyName}</p>
              <p className="text-xs text-slate-500 mt-1">Contact information not available in our database</p>
            </div>
          </div>
          
          <div className="mt-3 flex flex-wrap gap-2">
            {/* Search LinkedIn Button */}
            <button
              onClick={onSearchLinkedIn}
              className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition border border-blue-200"
            >
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
              Search on LinkedIn
            </button>

            {/* Draft Message Button */}
            <button
              onClick={onGenerateGenericOutreach}
              disabled={outreachLoading}
              className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 transition border border-purple-200 disabled:opacity-50"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {outreachLoading ? 'Generating...' : 'Draft Outreach Message'}
            </button>
          </div>
        </div>

        {/* Show generated outreach message */}
        {outreachMessage && !selectedHRContact && (
          <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h5 className="text-xs font-semibold text-purple-800 uppercase tracking-wide">
                  Outreach Message
                </h5>
                <p className="text-xs text-purple-600 mt-1">
                  Generic message ready to customize and send
                </p>
              </div>
              <button
                onClick={onCopyOutreachMessage}
                className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 transition border border-purple-200"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div>
                <p className="font-medium text-purple-900">Subject:</p>
                <p className="text-purple-800 mt-1">{outreachMessage.subject}</p>
              </div>
              <div>
                <p className="font-medium text-purple-900">Body:</p>
                <p className="text-purple-800 mt-1 whitespace-pre-line">{outreachMessage.body}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Regular job flow (non-InternSG)
  return (
    <div className="mt-6 pt-6 border-t border-slate-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">HR Contact</h3>
          <p className="text-sm text-slate-600 mt-1">
            Connect directly with hiring managers to increase your chances
          </p>
        </div>
      </div>
      
      {/* Show loading state */}
      {hrLoading ? (
        <div className="flex items-center gap-2 py-4">
          <svg className="animate-spin h-5 w-5 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-slate-600">Searching for HR contacts...</p>
        </div>
      ) : !hrFetched ? (
        /* Show initial "Find HR" button before any fetch attempt */
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-6">
          <div className="flex items-start gap-3">
            <svg className="h-6 w-6 text-brand-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900 mb-2">Find HR Contacts</h4>
              <p className="text-sm text-slate-600 mb-4">
                Search our database for HR contacts at {companyName}. We'll check our cache first, then search if needed.
              </p>
              <button
                onClick={onFindHR}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Find HR Contacts
              </button>
            </div>
          </div>
        </div>
      ) : hrProspects.length > 0 ? (
        /* Show HR contacts if found */
        <div className="space-y-3 mt-4">
          {hrProspects.slice(0, 2).map((prospect, idx) => (
            <div key={idx} className="rounded-lg border border-brand-200 bg-brand-50 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900">{prospect.full_name}</h4>
                  <p className="text-sm text-slate-600 mt-1">{prospect.job_title}</p>
                  <p className="text-xs text-slate-500 mt-1">{prospect.city}, {prospect.country}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {prospect.email && (
                  <button
                    onClick={() => onCopyEmail(prospect.email!)}
                    className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 transition border border-brand-200"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {prospect.email}
                  </button>
                )}
                {prospect.linkedin && (
                  <a
                    href={prospect.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition border border-blue-200"
                  >
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                    LinkedIn
                  </a>
                )}
                <button
                  onClick={() => onGenerateOutreach(prospect)}
                  disabled={outreachLoading}
                  className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 transition border border-purple-200 disabled:opacity-50"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {outreachLoading ? 'Generating...' : 'Draft Message'}
                </button>
              </div>
            </div>
          ))}
          
          {/* Show generated outreach message for specific HR contact */}
          {outreachMessage && selectedHRContact && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h5 className="text-xs font-semibold text-purple-800 uppercase tracking-wide">
                    Outreach Message for {selectedHRContact.full_name}
                  </h5>
                  <p className="text-xs text-purple-600 mt-1">
                    Personalized message ready to send
                  </p>
                </div>
                <button
                  onClick={onCopyOutreachMessage}
                  className="text-xs text-purple-700 hover:text-purple-900 font-medium flex items-center gap-1"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-semibold text-purple-700">Subject:</p>
                  <p className="text-sm text-purple-900">{outreachMessage.subject}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-purple-700">Message:</p>
                  <p className="text-sm text-purple-900 whitespace-pre-wrap">{outreachMessage.body}</p>
                </div>
              </div>
            </div>
          )}
          
          {hrProspects.length > 2 && (
            <button
              onClick={onViewAllContacts}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              View all {hrProspects.length} contacts →
            </button>
          )}
        </div>
      ) : (
        /* Show fallback options if no HR contacts found after fetch */
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-start gap-3">
            <svg className="h-6 w-6 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900 mb-2">No HR Contacts Found</h4>
              <p className="text-sm text-slate-600 mb-4">
                We couldn't find HR contacts for {companyName} in our database. Try searching on LinkedIn to find the hiring manager for this position.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={onSearchLinkedIn}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  Search LinkedIn for HR
                </button>
                <button
                  onClick={onGenerateGenericOutreach}
                  disabled={outreachLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {outreachLoading ? 'Generating...' : 'Draft Generic Message'}
                </button>
              </div>
              
              {/* Show generated generic outreach message */}
              {outreachMessage && !selectedHRContact && (
                <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h5 className="text-xs font-semibold text-purple-800 uppercase tracking-wide">
                        Generic Outreach Template
                      </h5>
                      <p className="text-xs text-purple-600 mt-1">
                        Fill in the placeholder values with the HR contact details you find on LinkedIn
                      </p>
                    </div>
                    <button
                      onClick={onCopyOutreachMessage}
                      className="text-xs text-purple-700 hover:text-purple-900 font-medium flex items-center gap-1"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-purple-700">Subject:</p>
                      <p className="text-sm text-purple-900">{outreachMessage.subject}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-purple-700">Message:</p>
                      <p className="text-sm text-purple-900 whitespace-pre-wrap">{outreachMessage.body}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
