'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { TrendingUp, Award, Calendar, BarChart3 } from 'lucide-react';

type Evaluation = {
  id: string;
  status: string;
  overallScore?: number | null;
  selfScore?: number | null;
  managerScore?: number | null;
  finalRating?: number | null;
  createdAt: string;
  updatedAt: string;
  cycle: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  items: {
    id: string;
    type: string;
    weight: number;
    selfScore?: number | null;
    managerScore?: number | null;
    finalScore?: number | null;
    competency?: { name: string } | null;
    kpi?: { name: string } | null;
  }[];
};

type AppraisalLetter = {
  id: string;
  subject: string;
  issuedOn: string;
  rating?: number | null;
  approvalStatus: string;
  evaluation: {
    cycle: { name: string };
  };
};

export default function PerformanceHistoryPage() {
  const { data: session } = useSession();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [letters, setLetters] = useState<AppraisalLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [evalRes, letterRes] = await Promise.all([
        fetch('/api/evaluations'),
        fetch('/api/appraisal-letters'),
      ]);

      const evalData = await evalRes.json();
      const letterData = await letterRes.json();

      setEvaluations(Array.isArray(evalData) ? evalData : []);
      setLetters(Array.isArray(letterData) ? letterData : []);
    } catch (error) {
      console.error('Failed to load performance history:', error);
    } finally {
      setLoading(false);
    }
  };

  const finalizedEvaluations = evaluations.filter(e => e.status === 'FINALIZED');
  const averageRating = finalizedEvaluations.length > 0
    ? finalizedEvaluations.reduce((sum, e) => sum + (e.finalRating || 0), 0) / finalizedEvaluations.length
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FINALIZED': return 'text-green-700 bg-green-100';
      case 'HR_REVIEW': return 'text-blue-700 bg-blue-100';
      case 'MANAGER_REVIEW': return 'text-yellow-700 bg-yellow-100';
      case 'SELF_REVIEW': return 'text-orange-700 bg-orange-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getRatingLabel = (rating: number | null | undefined) => {
    if (!rating) return 'Not Rated';
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 3.5) return 'Very Good';
    if (rating >= 2.5) return 'Good';
    if (rating >= 1.5) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#36454F]">Performance History</h1>
          <p className="mt-2 text-sm text-[#6F4E37]">
            View your complete performance evaluation history and ratings
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-[#9C8162]">Loading your performance history...</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4 mb-8">
              <div className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[#6F4E37]/10 p-3">
                    <TrendingUp className="h-5 w-5 text-[#6F4E37]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">Total Reviews</p>
                    <p className="text-2xl font-semibold text-[#36454F]">{evaluations.length}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-100 p-3">
                    <Award className="h-5 w-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">Completed</p>
                    <p className="text-2xl font-semibold text-[#36454F]">{finalizedEvaluations.length}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-3">
                    <BarChart3 className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">Avg Rating</p>
                    <p className="text-2xl font-semibold text-[#36454F]">
                      {averageRating > 0 ? averageRating.toFixed(1) : '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-100 p-3">
                    <Calendar className="h-5 w-5 text-purple-700" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">Appraisals</p>
                    <p className="text-2xl font-semibold text-[#36454F]">{letters.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Evaluations List */}
            <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#36454F] mb-4">Evaluation History</h2>
              
              {evaluations.length === 0 ? (
                <p className="text-center py-8 text-[#9C8162]">No evaluations found</p>
              ) : (
                <div className="space-y-4">
                  {evaluations.map((evaluation) => (
                    <div
                      key={evaluation.id}
                      className="border border-[#E8DCC4] rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedEvaluation(evaluation)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-[#36454F]">{evaluation.cycle.name}</h3>
                            <span className={`px-2 py-1 text-xs rounded-lg ${getStatusColor(evaluation.status)}`}>
                              {evaluation.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-[#6F4E37]">
                            {new Date(evaluation.cycle.startDate).toLocaleDateString('en-GB')} - {new Date(evaluation.cycle.endDate).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm font-medium text-[#9C8162]">Final Rating</p>
                          <div className="mt-1">
                            <span className="text-2xl font-bold text-[#36454F]">
                              {evaluation.finalRating?.toFixed(1) || '—'}
                            </span>
                            <p className="text-xs text-[#6F4E37] mt-1">
                              {getRatingLabel(evaluation.finalRating)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Score Breakdown */}
                      {evaluation.status === 'FINALIZED' && (
                        <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-[#E8DCC4]">
                          <div>
                            <p className="text-xs text-[#9C8162]">Self Score</p>
                            <p className="text-lg font-semibold text-[#36454F]">
                              {evaluation.selfScore?.toFixed(1) || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#9C8162]">Manager Score</p>
                            <p className="text-lg font-semibold text-[#36454F]">
                              {evaluation.managerScore?.toFixed(1) || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#9C8162]">Overall Score</p>
                            <p className="text-lg font-semibold text-[#36454F]">
                              {evaluation.overallScore?.toFixed(1) || '—'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Detailed View Modal */}
            {selectedEvaluation && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedEvaluation(null)}>
                <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#36454F]">{selectedEvaluation.cycle.name}</h2>
                      <p className="text-sm text-[#6F4E37] mt-1">
                        Detailed evaluation breakdown
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedEvaluation(null)}
                      className="text-[#6F4E37] hover:bg-[#F4ECE2] rounded-lg p-2"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Items Breakdown */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-[#36454F]">Evaluation Items</h3>
                    {selectedEvaluation.items.map((item) => (
                      <div key={item.id} className="border border-[#E8DCC4] rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-[#36454F]">
                              {item.competency?.name || item.kpi?.name || 'Item'}
                            </p>
                            <p className="text-xs text-[#9C8162]">
                              {item.type} • Weight: {item.weight}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-[#9C8162]">Self Score</p>
                            <p className="font-semibold text-[#36454F]">{item.selfScore || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[#9C8162]">Manager Score</p>
                            <p className="font-semibold text-[#36454F]">{item.managerScore || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[#9C8162]">Final Score</p>
                            <p className="font-semibold text-[#36454F]">{item.finalScore || '—'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
