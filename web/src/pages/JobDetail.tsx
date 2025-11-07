import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BreakdownCards from '../components/BreakdownCards';
import ProfileChips from '../components/ProfileChips';
import ScoreGauge from '../components/ScoreGauge';
import Modal from '../components/Modal';
import { analyzeJobFit, createApplication, searchHRContacts, generateOutreachMessage, type HRProspect, type JobAnalysisResponse } from '../api/client';
import { useJobDetail } from '../hooks/useJobs';
import { useProfileStore } from '../store/profile';
import type { CompassScore } from '../types';

type ModalType = 'apply' | 'hr' | 'assess' | 'report' | null;

export default function JobDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useJobDetail(id);
  const profile = useProfileStore((state) => state.profile);
  const addApplication = useProfileStore((state) => state.addApplication);
  const [scoreOverride, setScoreOverride] = useState(data?.score);
  const [verdictOverride, setVerdictOverride] = useState(data?.epIndicator);
  const [scoreDetails, setScoreDetails] = useState<CompassScore | undefined>(
    data?.score && data.breakdown
      ? {
          total: data.score,
          breakdown: data.breakdown,
          verdict: (data.epIndicator ?? 'Borderline') as CompassScore['verdict'],
          notes: data.rationale ?? []
        }
      : undefined
  );
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [applicationNotes, setApplicationNotes] = useState<string>('');
  const [hasApplied, setHasApplied] = useState(false);
  const [hrProspects, setHrProspects] = useState<HRProspect[]>([]);
  const [hrLoading, setHrLoading] = useState(false);
  const [assessmentReport, setAssessmentReport] = useState<JobAnalysisResponse | null>(null);
  const [outreachMessage, setOutreachMessage] = useState<{ subject: string; body: string } | null>(null);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [selectedHRContact, setSelectedHRContact] = useState<HRProspect | null>(null);

  useEffect(() => {
    if (data?.score !== undefined) {
      setScoreOverride(data.score);
      setVerdictOverride(data.epIndicator);
      if (data.breakdown) {
        setScoreDetails({
          total: data.score,
          breakdown: data.breakdown,
          verdict: (data.epIndicator ?? 'Borderline') as CompassScore['verdict'],
          notes: data.rationale ?? []
        });
      }
    }
  }, [data?.score, data?.epIndicator, data?.breakdown, data?.rationale]);

  if (!id) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-sm text-red-500">Job not found.</p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-sm text-slate-500">Loading job details...</p>
      </div>
    );
  }

  const handleAssessFit = async () => {
    if (!profile) {
      navigate('/assessment');
      return;
    }
    setActiveModal('assess');
  };

  const handleConfirmAssess = async (regenerate = false) => {
    if (!profile || !id) return;
    
    setStatus('loading');
    setActiveModal(null);
    try {
      const result = await analyzeJobFit(id, regenerate);
      setAssessmentReport(result);
      setScoreOverride(result.overall_score);
      
      // Map decision to verdict
      const verdictMap = {
        'strong_match': 'Likely',
        'possible_match': 'Borderline',
        'weak_match': 'Unlikely',
        'reject': 'Unlikely'
      } as const;
      setVerdictOverride(verdictMap[result.decision]);
      
      // Convert subscores to breakdown format
      const breakdown = {
        salary: Math.round((result.subscores.tools_stack / 5) * 20),
        qualifications: Math.round((result.subscores.must_have / 5) * 20),
        diversity: Math.round((result.subscores.domain_fit / 5) * 20),
        support: Math.round((result.subscores.communication / 5) * 20),
        skills: Math.round((result.subscores.nice_to_have / 5) * 20),
        strategic: Math.round((result.subscores.impact_evidence / 5) * 10)
      };
      
      setScoreDetails({
        total: result.overall_score,
        breakdown,
        verdict: verdictMap[result.decision],
        notes: result.recommendations_to_candidate
      });
      
      setStatus('success');
      setStatusMessage(result.from_cache && !regenerate 
        ? 'Loaded existing assessment from database.' 
        : 'Fit assessment completed with detailed LLM analysis.');
      
      // Show the detailed report modal
      setActiveModal('report');
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Unable to assess fit.');
    }
  };

  const handleOpenExternalLink = () => {
    const externalUrl = (data as any).url || `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(data.title + ' ' + data.company)}`;
    
    // Open external job link
    window.open(externalUrl, '_blank', 'noopener,noreferrer');
    
    // Show confirmation modal after a short delay
    setTimeout(() => {
      setActiveModal('apply');
    }, 1000);
  };

  const handleConfirmApplication = async () => {
    if (!profile) {
      navigate('/assessment');
      return;
    }
    
    try {
      const externalUrl = (data as any).url || '';
      const application = await createApplication({
        jobId: data.id,
        jobTitle: data.title,
        jobCompany: data.company,
        jobUrl: externalUrl,
        status: 'sent',
        notes: applicationNotes,
        appliedAt: new Date().toISOString()
      });
      addApplication(application);
      setHasApplied(true);
      setStatus('success');
      setStatusMessage('Application recorded! Track it in Applications.');
      setActiveModal(null);
      setApplicationNotes('');
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Unable to record application.');
    }
  };

  const handleContactHR = async () => {
    if (!profile) {
      navigate('/assessment');
      return;
    }
    
    setHrLoading(true);
    setActiveModal('hr');
    
    try {
      // Extract domain from company name or use a default
      // In a real scenario, you'd have the company website URL
      const companyDomain = `${data.company.toLowerCase().replace(/\s+/g, '')}.com`;
      
      const result = await searchHRContacts({
        company_domain: companyDomain,
        fetch_count: 3
      });
      
      setHrProspects(result.prospects);
      setHrLoading(false);
    } catch (error) {
      console.error('Failed to fetch HR contacts:', error);
      setHrProspects([]);
      setHrLoading(false);
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setStatus('success');
    setStatusMessage('Email copied to clipboard!');
    setTimeout(() => {
      setStatus('idle');
      setStatusMessage('');
    }, 2000);
  };

  const handleGenerateOutreach = async (hrContact: HRProspect) => {
    if (!data) return;
    
    setSelectedHRContact(hrContact);
    setOutreachLoading(true);
    setOutreachMessage(null);
    
    try {
      const message = await generateOutreachMessage({
        job_external_id: data.id,
        job_title: data.title,
        job_company: data.company,
        hr_name: hrContact.full_name,
        hr_email: hrContact.email || hrContact.personal_email || undefined,
        hr_job_title: hrContact.job_title
      });
      
      setOutreachMessage(message);
      setStatus('success');
      setStatusMessage('Outreach message generated!');
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to generate message');
    } finally {
      setOutreachLoading(false);
    }
  };

  const handleCopyOutreachMessage = () => {
    if (!outreachMessage) return;
    
    const fullMessage = `Subject: ${outreachMessage.subject}\n\n${outreachMessage.body}`;
    navigator.clipboard.writeText(fullMessage);
    setStatus('success');
    setStatusMessage('Message copied to clipboard!');
    setTimeout(() => {
      setStatus('idle');
      setStatusMessage('');
    }, 2000);
  };

  const currentScore = scoreOverride ?? data.score ?? 0;
  const currentVerdict = (verdictOverride ?? data.epIndicator ?? 'Borderline') as CompassScore['verdict'];

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Modals */}
      <Modal
        open={activeModal === 'apply'}
        title="Confirm Application"
        description="Did you complete your application on the external site?"
        onClose={() => setActiveModal(null)}
        footer={
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmApplication}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Yes, I Applied
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            We'll track this application in your dashboard. You can add notes to help you remember details about this role.
          </p>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={applicationNotes}
              onChange={(e) => setApplicationNotes(e.target.value)}
              placeholder="e.g., Submitted cover letter, contacted recruiter..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              rows={3}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={activeModal === 'hr'}
        title="HR Contacts"
        description={`Found ${hrProspects.length} HR contacts at ${data.company}`}
        onClose={() => {
          setActiveModal(null);
          setHrProspects([]);
        }}
      >
        <div className="space-y-4">
          {hrLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-8 w-8 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="ml-3 text-sm text-slate-600">Searching for HR contacts...</p>
            </div>
          ) : hrProspects.length === 0 ? (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-6 text-center">
              <p className="text-sm text-slate-600">No HR contacts found for this company.</p>
              <p className="text-xs text-slate-500 mt-2">Try searching on LinkedIn or the company's careers page.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hrProspects.map((prospect, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 bg-white p-4 hover:border-brand-300 transition">
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
                        onClick={() => handleCopyEmail(prospect.email!)}
                        className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 transition"
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
                        className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"
                      >
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                        </svg>
                        LinkedIn
                      </a>
                    )}
                    <button
                      onClick={() => handleGenerateOutreach(prospect)}
                      disabled={outreachLoading}
                      className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 transition disabled:opacity-50"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      {outreachLoading && selectedHRContact?.email === prospect.email ? 'Generating...' : 'Draft Message'}
                    </button>
                  </div>
                  
                  {/* Show generated outreach message */}
                  {outreachMessage && selectedHRContact?.email === prospect.email && (
                    <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="text-xs font-semibold text-purple-800 uppercase tracking-wide">
                          Generated Outreach Message
                        </h5>
                        <button
                          onClick={handleCopyOutreachMessage}
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
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={activeModal === 'assess'}
        title="Assess Fit with LLM"
        description="Get detailed analysis of how well you match this role"
        onClose={() => setActiveModal(null)}
        footer={
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleConfirmAssess(false)}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Run Assessment
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This will use AI to analyze your profile against the job requirements and provide detailed recommendations. The analysis typically takes 10-15 seconds.
          </p>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">What you'll get:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Updated COMPASS score based on this specific role</li>
              <li>• Detailed breakdown across 6 dimensions</li>
              <li>• Personalized recommendations to improve your match</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* Detailed Assessment Report Modal */}
      <Modal
        open={activeModal === 'report'}
        title="Job Fit Assessment Report"
        description={assessmentReport ? `Analysis for ${assessmentReport.role_title} at ${data.company}` : ''}
        onClose={() => setActiveModal(null)}
        footer={
          <div className="flex gap-3 justify-between w-full">
            <div className="flex items-center gap-2">
              {assessmentReport?.from_cache && (
                <span className="text-xs text-slate-500 italic">
                  📋 Loaded from previous analysis
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  handleConfirmAssess(true);
                }}
                className="rounded-lg border border-brand-600 bg-white px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
              >
                🔄 Regenerate
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Close
              </button>
            </div>
          </div>
        }
      >
        {assessmentReport && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Overall Score & Decision */}
            <div className="rounded-lg bg-gradient-to-br from-brand-50 to-blue-50 border border-brand-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {assessmentReport.overall_score}/100
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">Overall Match Score</p>
                </div>
                <div className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${
                  assessmentReport.decision === 'strong_match' ? 'bg-green-100 text-green-800' :
                  assessmentReport.decision === 'possible_match' ? 'bg-yellow-100 text-yellow-800' :
                  assessmentReport.decision === 'weak_match' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {assessmentReport.decision.replace('_', ' ').toUpperCase()}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-brand-200">
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">Must-Have Coverage</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-brand-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${assessmentReport.must_have_coverage * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">
                    {Math.round(assessmentReport.must_have_coverage * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Subscores Grid */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Detailed Subscores</h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(assessmentReport.subscores).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-600 capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-lg font-bold text-brand-600">{value}/5</span>
                    </div>
                    <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-brand-600 h-full rounded-full transition-all"
                        style={{ width: `${(value / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence Section */}
            {(assessmentReport.evidence.matched_must_haves.length > 0 || 
              assessmentReport.evidence.matched_nice_to_haves.length > 0) && (
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
                  ✅ Strengths & Matches
                </h4>
                <div className="space-y-4">
                  {assessmentReport.evidence.matched_must_haves.length > 0 && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <h5 className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-2">
                        Matched Must-Haves
                      </h5>
                      <ul className="space-y-1">
                        {assessmentReport.evidence.matched_must_haves.map((item, idx) => (
                          <li key={idx} className="text-sm text-green-900 flex items-start gap-2">
                            <span className="text-green-600 mt-0.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {assessmentReport.evidence.matched_nice_to_haves.length > 0 && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <h5 className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">
                        Matched Nice-to-Haves
                      </h5>
                      <ul className="space-y-1">
                        {assessmentReport.evidence.matched_nice_to_haves.map((item, idx) => (
                          <li key={idx} className="text-sm text-blue-900 flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {assessmentReport.evidence.impact_highlights.length > 0 && (
                    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                      <h5 className="text-xs font-semibold text-purple-800 uppercase tracking-wide mb-2">
                        Impact Highlights
                      </h5>
                      <ul className="space-y-1">
                        {assessmentReport.evidence.impact_highlights.map((item, idx) => (
                          <li key={idx} className="text-sm text-purple-900 flex items-start gap-2">
                            <span className="text-purple-600 mt-0.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {assessmentReport.evidence.tools_stack_matched.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <h5 className="text-xs font-semibold text-slate-800 uppercase tracking-wide mb-2">
                        Tools & Tech Stack
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {assessmentReport.evidence.tools_stack_matched.map((tool, idx) => (
                          <span key={idx} className="inline-block rounded-full bg-white border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Gaps Section */}
            {(assessmentReport.gaps.missing_must_haves.length > 0 || 
              assessmentReport.gaps.risks.length > 0) && (
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
                  ⚠️ Gaps & Areas for Improvement
                </h4>
                <div className="space-y-4">
                  {assessmentReport.gaps.missing_must_haves.length > 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <h5 className="text-xs font-semibold text-red-800 uppercase tracking-wide mb-2">
                        Missing Must-Haves
                      </h5>
                      <ul className="space-y-1">
                        {assessmentReport.gaps.missing_must_haves.map((item, idx) => (
                          <li key={idx} className="text-sm text-red-900 flex items-start gap-2">
                            <span className="text-red-600 mt-0.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {assessmentReport.gaps.risks.length > 0 && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                      <h5 className="text-xs font-semibold text-orange-800 uppercase tracking-wide mb-2">
                        Potential Risks
                      </h5>
                      <ul className="space-y-1">
                        {assessmentReport.gaps.risks.map((risk, idx) => (
                          <li key={idx} className="text-sm text-orange-900 flex items-start gap-2">
                            <span className="text-orange-600 mt-0.5">•</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {assessmentReport.recommendations_to_candidate.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
                  💡 Recommendations for You
                </h4>
                <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
                  <ul className="space-y-2">
                    {assessmentReport.recommendations_to_candidate.map((rec, idx) => (
                      <li key={idx} className="text-sm text-slate-700 flex items-start gap-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Interview Questions */}
            {assessmentReport.questions_for_interview.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
                  🎯 Suggested Interview Questions
                </h4>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500 mb-3">Questions the hiring manager might ask based on your profile:</p>
                  <ul className="space-y-2">
                    {assessmentReport.questions_for_interview.map((question, idx) => (
                      <li key={idx} className="text-sm text-slate-700 flex items-start gap-3 pl-4 border-l-2 border-brand-400">
                        <span>{question}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Notes */}
            {assessmentReport.notes && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Additional Notes</h5>
                <p className="text-sm text-slate-700">{assessmentReport.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Takes 2 columns on desktop */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-slate-500">{data.company}</p>
                <h1 className="text-3xl font-semibold text-slate-900">{data.title}</h1>
                <p className="mt-2 text-sm text-slate-500">
                  {data.location} · {data.industry}
                </p>
              </div>
              <ScoreGauge value={currentScore} verdict={currentVerdict} />
            </div>
            <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-slate-600">{data.description}</p>
            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Requirements</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {data.requirements.map((req) => (
                  <li key={req}>- {req}</li>
                ))}
              </ul>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-500">
              <span>
                Salary:{' '}
                {data.salaryMinSGD && data.salaryMaxSGD
                  ? `$${data.salaryMinSGD.toLocaleString()} - $${data.salaryMaxSGD.toLocaleString()}`
                  : 'Pending'}
              </span>
              <span>Employer size: {data.employer.size}</span>
              {data.employer.diversityScore && (
                <span>Diversity: {(data.employer.diversityScore * 100).toFixed(0)}%</span>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-3">
              <button
                type="button"
                onClick={assessmentReport ? () => setActiveModal('report') : handleAssessFit}
                disabled={status === 'loading'}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === 'loading' 
                  ? 'Analyzing...' 
                  : assessmentReport 
                    ? 'View Assessment Report' 
                    : 'Assess fit with my profile'}
              </button>
              <button
                type="button"
                onClick={handleContactHR}
                disabled={status === 'loading'}
                className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Contact HR
              </button>
              <button
                type="button"
                onClick={handleOpenExternalLink}
                disabled={hasApplied}
                className="inline-flex items-center justify-center rounded-lg border border-brand-200 px-5 py-2 text-sm font-semibold text-brand-600 hover:border-brand-400 hover:text-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {hasApplied ? (
                  <>
                    <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    Applied
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Apply Now
                  </>
                )}
              </button>
            </div>
            {status === 'loading' && <p className="mt-4 text-sm text-slate-500">Processing your request...</p>}
            {status === 'success' && (
              <div className="mt-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                <p className="text-sm text-green-800">{statusMessage}</p>
              </div>
            )}
            {status === 'error' && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-800">{statusMessage}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <BreakdownCards score={scoreDetails} />
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">EP Rationale</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {(scoreDetails?.notes ?? data.rationale ?? []).map((item) => (
                  <li key={item}>- {item}</li>
                ))}
                {(scoreDetails?.notes ?? data.rationale ?? []).length === 0 && <li>No rationale provided.</li>}
              </ul>
            </div>
          </div>
        </div>
        
        {/* Sidebar - Profile & Assessment - Takes 1 column on desktop */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Snapshot */}
          <ProfileChips profile={profile} title="Your Profile Snapshot" />
          
          {/* Tips Card - Only shows when no assessment */}
          {data && !assessmentReport && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Keep improving</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>- Update your profile after tweaking your resume.</li>
                <li>- Save tips and integrate them before re-assessment.</li>
                <li>- Track mock applications from the top navigation.</li>
              </ul>
            </div>
          )}
          
          {/* Assessment Report Summary - Shows when available */}
          {assessmentReport && (
              <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-blue-50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-700">
                    📊 Detailed Assessment Available
                  </h3>
                  {assessmentReport.from_cache && (
                    <span className="text-xs bg-white rounded-full px-2 py-1 text-slate-600 border border-slate-200">
                      Cached
                    </span>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="text-4xl font-bold text-brand-600">
                        {assessmentReport.overall_score}
                      </div>
                      <div className="text-xs text-slate-600 text-center">/ 100</div>
                    </div>
                    <div className="flex-1">
                      <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                        assessmentReport.decision === 'strong_match' ? 'bg-green-100 text-green-800' :
                        assessmentReport.decision === 'possible_match' ? 'bg-yellow-100 text-yellow-800' :
                        assessmentReport.decision === 'weak_match' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {assessmentReport.decision.replace('_', ' ').toUpperCase()}
                      </div>
                      <div className="mt-2">
                        <div className="text-xs text-slate-500 mb-1">Must-Have Coverage</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-white rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-brand-600 h-full rounded-full transition-all"
                              style={{ width: `${assessmentReport.must_have_coverage * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-brand-700">
                            {Math.round(assessmentReport.must_have_coverage * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-brand-200">
                    <div className="text-xs text-slate-600 mb-2">Quick Stats:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white rounded-lg px-3 py-2 border border-slate-200">
                        <div className="text-slate-500">Matched Must-Haves</div>
                        <div className="font-semibold text-green-700">
                          {assessmentReport.evidence.matched_must_haves.length}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg px-3 py-2 border border-slate-200">
                        <div className="text-slate-500">Missing Must-Haves</div>
                        <div className="font-semibold text-red-700">
                          {assessmentReport.gaps.missing_must_haves.length}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg px-3 py-2 border border-slate-200">
                        <div className="text-slate-500">Recommendations</div>
                        <div className="font-semibold text-brand-700">
                          {assessmentReport.recommendations_to_candidate.length}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg px-3 py-2 border border-slate-200">
                        <div className="text-slate-500">Interview Questions</div>
                        <div className="font-semibold text-purple-700">
                          {assessmentReport.questions_for_interview.length}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveModal('report')}
                    className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition flex items-center justify-center gap-2"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View Full Report
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
