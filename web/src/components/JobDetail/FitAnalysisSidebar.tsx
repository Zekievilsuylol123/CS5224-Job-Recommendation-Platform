import type { JobAnalysisResponse } from '../../api/client';
import type { CompassScore } from '../../types';

interface FitAnalysisSidebarProps {
  assessmentReport: JobAnalysisResponse;
  scoreDetails?: CompassScore;
  onViewFullReport: () => void;
  onHide: () => void;
}

export default function FitAnalysisSidebar({
  assessmentReport,
  scoreDetails,
  onViewFullReport,
  onHide
}: FitAnalysisSidebarProps) {
  return (
    <div className="rounded-3xl border border-brand-200 bg-white p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          My Fit for This Role
        </h3>
        {assessmentReport.from_cache && (
          <span className="text-xs bg-brand-50 rounded-full px-2 py-1 text-brand-700 border border-brand-200">
            Cached
          </span>
        )}
      </div>
      
      <div className="space-y-4">
        {/* Key Requirements (from gaps + matches) */}
        {(assessmentReport.evidence?.matched_must_haves || assessmentReport.gaps?.missing_must_haves) && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Key Requirements
            </h4>
            <div className="space-y-2">
              {/* Show matched requirements first */}
              {(assessmentReport.evidence?.matched_must_haves || []).slice(0, 3).map((req, idx) => (
                <div key={`match-${idx}`} className="flex items-start gap-2">
                  <span className="text-green-500 text-xs mt-0.5 flex-shrink-0">✓</span>
                  <span className="text-xs text-slate-700">{req}</span>
                </div>
              ))}
              {/* Show missing requirements */}
              {(assessmentReport.gaps?.missing_must_haves || []).slice(0, 3).map((req, idx) => (
                <div key={`gap-${idx}`} className="flex items-start gap-2">
                  <span className="text-orange-500 text-xs mt-0.5 flex-shrink-0">!</span>
                  <span className="text-xs text-slate-700">{req}</span>
                </div>
              ))}
              {((assessmentReport.evidence?.matched_must_haves?.length || 0) + (assessmentReport.gaps?.missing_must_haves?.length || 0)) > 6 && (
                <p className="text-xs text-slate-500 italic mt-2">
                  +{((assessmentReport.evidence?.matched_must_haves?.length || 0) + (assessmentReport.gaps?.missing_must_haves?.length || 0)) - 6} more requirements
                </p>
              )}
            </div>
          </div>
        )}

        {/* Overall Match */}
        <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
          <div className="flex-shrink-0">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-lg font-bold ${
              assessmentReport.decision === 'strong_match' ? 'bg-green-100 text-green-700' :
              assessmentReport.decision === 'possible_match' ? 'bg-yellow-100 text-yellow-700' :
              assessmentReport.decision === 'weak_match' ? 'bg-orange-100 text-orange-700' :
              'bg-red-100 text-red-700'
            }`}>
              {Math.round((assessmentReport.must_have_coverage || 0) * 100)}%
            </div>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900 capitalize">
              {(assessmentReport.decision || 'unknown').replace('_', ' ')}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              Must-have coverage
            </div>
          </div>
        </div>

        {/* Matched Requirements */}
        {assessmentReport.evidence?.matched_must_haves && assessmentReport.evidence.matched_must_haves.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <h4 className="text-xs font-semibold text-green-700">
                You Match ({assessmentReport.evidence.matched_must_haves.length})
              </h4>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-600 ml-6">
              {assessmentReport.evidence.matched_must_haves.slice(0, 3).map((match, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>{match}</span>
                </li>
              ))}
              {assessmentReport.evidence.matched_must_haves.length > 3 && (
                <li className="text-slate-500 italic">
                  +{assessmentReport.evidence.matched_must_haves.length - 3} more matches
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Missing Requirements */}
        {assessmentReport.gaps?.missing_must_haves && assessmentReport.gaps.missing_must_haves.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-4 w-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h4 className="text-xs font-semibold text-orange-700">
                Gaps to Address ({assessmentReport.gaps.missing_must_haves.length})
              </h4>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-600 ml-6">
              {assessmentReport.gaps.missing_must_haves.slice(0, 3).map((gap, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-orange-600 mt-0.5">!</span>
                  <span>{gap}</span>
                </li>
              ))}
              {assessmentReport.gaps.missing_must_haves.length > 3 && (
                <li className="text-slate-500 italic">
                  +{assessmentReport.gaps.missing_must_haves.length - 3} more gaps
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {assessmentReport.recommendations_to_candidate && assessmentReport.recommendations_to_candidate.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
              </svg>
              <h4 className="text-xs font-semibold text-blue-700">
                Tips to Improve
              </h4>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-600 ml-6">
              {assessmentReport.recommendations_to_candidate.slice(0, 3).map((rec, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-blue-600 mt-0.5">→</span>
                  <span>{rec}</span>
                </li>
              ))}
              {assessmentReport.recommendations_to_candidate.length > 3 && (
                <li className="text-slate-500 italic">
                  +{assessmentReport.recommendations_to_candidate.length - 3} more tips
                </li>
              )}
            </ul>
          </div>
        )}

        {/* COMPASS Score Dropdown */}
        {scoreDetails && (
          <details className="group border-t border-slate-200 pt-4">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                COMPASS Score Details
              </h4>
              <svg className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="text-2xl font-bold text-brand-600">
                  {scoreDetails.totalRaw}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">
                    {scoreDetails.verdict}
                  </div>
                  <div className="text-xs text-slate-500">Overall EP Score</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Salary</span>
                  <span className="font-semibold text-slate-900">{scoreDetails.breakdown.salary}/25</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Qualifications</span>
                  <span className="font-semibold text-slate-900">{scoreDetails.breakdown.qualifications}/25</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Diversity</span>
                  <span className="font-semibold text-slate-900">{scoreDetails.breakdown.diversity}/10</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Support</span>
                  <span className="font-semibold text-slate-900">{scoreDetails.breakdown.support}/10</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Skills</span>
                  <span className="font-semibold text-slate-900">{scoreDetails.breakdown.skills}/20</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Strategic</span>
                  <span className="font-semibold text-slate-900">{scoreDetails.breakdown.strategic}/10</span>
                </div>
              </div>
            </div>
          </details>
        )}

        <button
          onClick={onViewFullReport}
          className="w-full mt-4 text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center justify-center gap-1"
        >
          View Full Report
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        
        <button
          onClick={onHide}
          className="w-full text-xs text-slate-500 hover:text-slate-700 font-medium"
        >
          Hide Analysis
        </button>
      </div>
    </div>
  );
}
