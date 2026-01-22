'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const assessmentSchema = z.object({
  competencyRatings: z.record(z.string(), z.number().min(1).max(5)),
  kpiAchievements: z.record(z.string(), z.object({
    achieved: z.number(),
    evidence: z.string().min(10, 'Please provide evidence'),
  })),
  accomplishments: z.string().min(50, 'Please describe key accomplishments (minimum 50 characters)'),
  challenges: z.string().min(30, 'Please describe challenges faced (minimum 30 characters)'),
  developmentNeeds: z.string().min(30, 'Please specify development needs (minimum 30 characters)'),
  comments: z.string().optional(),
});

type AssessmentFormData = z.infer<typeof assessmentSchema>;

interface Competency {
  id: string;
  name: string;
  description: string;
  category?: string | null;
  weight?: number | null;
}

interface KPI {
  id: string;
  name: string;
  target?: number | null;
  unit?: string | null;
}

interface ReviewCycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  selfAssessmentDeadline: string;
  status: string;
}

export default function SelfAssessmentPage() {
  const { data: session } = useSession();
  const [cycle, setCycle] = useState<ReviewCycle | null>(null);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedRating, setSelectedRating] = useState<{ [key: string]: number }>({});
  const [kpiData, setKpiData] = useState<{ [key: string]: { achieved: number; evidence: string } }>({});

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    reset,
  } = useForm<AssessmentFormData>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      competencyRatings: {},
      kpiAchievements: {},
    },
  });

  const handleRatingClick = (competencyId: string, rating: number) => {
    setSelectedRating({ ...selectedRating, [competencyId]: rating });
    setValue(`competencyRatings.${competencyId}`, rating);
  };

  const handleKpiChange = (kpiId: string, field: 'achieved' | 'evidence', value: string | number) => {
    const updated = {
      ...kpiData,
      [kpiId]: {
        ...kpiData[kpiId],
        [field]: value,
      },
    };
    setKpiData(updated);
    setValue(`kpiAchievements.${kpiId}`, updated[kpiId]);
  };

  const onSubmit = async (data: AssessmentFormData) => {
    try {
      if (!evaluationId) {
        toast.error('Evaluation not ready. Please refresh and try again.');
        return;
      }

      const competencyEntries = Object.entries(data.competencyRatings || {});
      const kpiEntries = Object.entries(data.kpiAchievements || {});

      await Promise.all([
        ...competencyEntries.map(([competencyId, rating]) =>
          fetch(`/api/evaluations/${evaluationId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'COMPETENCY',
              competencyId,
              selfScore: rating,
            }),
          })
        ),
        ...kpiEntries.map(([kpiId, payload]) =>
          fetch(`/api/evaluations/${evaluationId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'KPI',
              kpiId,
              selfScore: payload.achieved,
              comments: payload.evidence,
            }),
          })
        ),
      ]);

      await fetch('/api/self-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluationId,
          accomplishments: data.accomplishments,
          challenges: data.challenges,
          developmentNeeds: data.developmentNeeds,
          comments: data.comments,
        }),
      });

      const avgScore = competencyEntries.length
        ? competencyEntries.reduce((sum, [, rating]) => sum + rating, 0) / competencyEntries.length
        : null;

      await fetch(`/api/evaluations/${evaluationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'MANAGER_REVIEW',
          selfScore: avgScore,
        }),
      });

      toast.success('Self-assessment submitted successfully');
    } catch (error) {
      toast.error('Failed to submit assessment');
      console.error(error);
    }
  };

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 1:
        return 'Needs Improvement';
      case 2:
        return 'Below Expectations';
      case 3:
        return 'Meets Expectations';
      case 4:
        return 'Exceeds Expectations';
      case 5:
        return 'Outstanding';
      default:
        return '';
    }
  };

  const daysRemaining = useMemo(() => {
    if (!cycle?.selfAssessmentDeadline) return null;
    return Math.ceil(
      (new Date(cycle.selfAssessmentDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
  }, [cycle]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [cyclesRes, compsRes, kpisRes] = await Promise.all([
          fetch('/api/review-cycles'),
          fetch('/api/competencies'),
          fetch('/api/kpis'),
        ]);
        const cycles = await cyclesRes.json();
        const comps = await compsRes.json();
        const kpiList = await kpisRes.json();

        const activeCycle = Array.isArray(cycles)
          ? cycles.find((c) => c.status === 'ACTIVE') || cycles[0]
          : null;
        setCycle(activeCycle || null);
        setCompetencies(Array.isArray(comps) ? comps : []);
        setKpis(Array.isArray(kpiList) ? kpiList : []);

        const employeeId = session?.user?.employeeId;
        if (!employeeId || !activeCycle?.id) return;

        const evaluationsRes = await fetch('/api/evaluations');
        const evaluations = await evaluationsRes.json();
        const existing = Array.isArray(evaluations)
          ? evaluations.find((e) => e.employeeId === employeeId && e.cycleId === activeCycle.id)
          : null;

        const evaluation = existing
          ? existing
          : await (await fetch('/api/evaluations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ employeeId, cycleId: activeCycle.id }),
            })).json();

        setEvaluationId(evaluation?.id || null);

        if (evaluation?.id) {
          const assessmentRes = await fetch(`/api/self-assessments?evaluationId=${evaluation.id}`);
          const assessment = await assessmentRes.json();
          if (assessment) {
            reset({
              accomplishments: assessment.accomplishments ?? '',
              challenges: assessment.challenges ?? '',
              developmentNeeds: assessment.developmentNeeds ?? '',
              comments: assessment.comments ?? '',
              competencyRatings: {},
              kpiAchievements: {},
            });
          }
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to load assessment data');
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      load();
    }
  }, [session?.user, reset]);

  return (
    <div className="min-h-screen bg-[#F7F4EF] p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#36454F]">Self-Assessment</h1>
          <p className="mt-1 text-sm text-[#6F4E37]">
            {cycle ? `${cycle.name} • Due ${new Date(cycle.selfAssessmentDeadline).toLocaleDateString()}` : 'Loading cycle...'}
          </p>
          {daysRemaining && daysRemaining > 0 && (
            <div className="mt-2 inline-block rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
              {daysRemaining} days remaining
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-900">
            <span>ℹ️</span>
            <span>Instructions</span>
          </h2>
          <ul className="space-y-1 text-xs text-blue-800">
            <li>• Rate yourself honestly on each competency using the 1-5 scale</li>
            <li>• Provide evidence for your KPI achievements</li>
            <li>• Reflect on accomplishments, challenges, and development needs</li>
            <li>• Your manager will review and provide their assessment</li>
            <li>• Be specific and provide concrete examples</li>
          </ul>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-8 text-center text-sm text-[#9C8162]">
            Loading assessment...
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Competencies Section */}
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#36454F]">Competency Ratings</h2>
            <p className="mb-6 text-sm text-[#6F4E37]">
              Rate yourself on each competency (1 = Needs Improvement, 5 = Outstanding)
            </p>

            <div className="space-y-6">
              {competencies.map((comp) => (
                <div key={comp.id} className="border-b border-[#F4ECE2] pb-6 last:border-0 last:pb-0">
                  <div className="mb-3">
                    <h3 className="font-semibold text-[#36454F]">{comp.name}</h3>
                    <p className="text-xs text-[#6F4E37]">{comp.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleRatingClick(comp.id, rating)}
                        className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 text-lg font-bold transition-all ${
                          selectedRating[comp.id] === rating
                            ? 'border-[#6F4E37] bg-[#6F4E37] text-white scale-110'
                            : 'border-[#E8DCC4] bg-white text-[#9C8162] hover:border-[#6F4E37] hover:bg-[#F4ECE2]'
                        }`}
                      >
                        {rating}
                      </button>
                    ))}
                    {selectedRating[comp.id] && (
                      <span className="ml-4 text-sm font-medium text-[#6F4E37]">
                        {getRatingLabel(selectedRating[comp.id])}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* KPIs Section */}
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#36454F]">KPI Achievements</h2>
            <p className="mb-6 text-sm text-[#6F4E37]">
              Report your achievements against each KPI with supporting evidence
            </p>

            <div className="space-y-6">
              {kpis.map((kpi) => (
                <div key={kpi.id} className="border-b border-[#F4ECE2] pb-6 last:border-0 last:pb-0">
                  <h3 className="mb-2 font-semibold text-[#36454F]">{kpi.name}</h3>
                  <p className="mb-3 text-xs text-[#6F4E37]">
                    Target: {kpi.target}
                    {kpi.unit}
                  </p>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-[#36454F]">
                        Achievement {kpi.unit}
                      </label>
                      <input
                        type="number"
                        value={kpiData[kpi.id]?.achieved || ''}
                        onChange={(e) => handleKpiChange(kpi.id, 'achieved', parseFloat(e.target.value))}
                        placeholder={`e.g., ${kpi.target}`}
                        className="mt-1 w-full rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm focus:border-[#6F4E37] focus:outline-none focus:ring-2 focus:ring-[#6F4E37]/20"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-[#36454F]">Evidence</label>
                      <input
                        type="text"
                        value={kpiData[kpi.id]?.evidence || ''}
                        onChange={(e) => handleKpiChange(kpi.id, 'evidence', e.target.value)}
                        placeholder="Provide supporting evidence..."
                        className="mt-1 w-full rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm focus:border-[#6F4E37] focus:outline-none focus:ring-2 focus:ring-[#6F4E37]/20"
                      />
                    </div>
                  </div>

                  {kpiData[kpi.id]?.achieved != null && (
                    <div className="mt-3">
                      {(() => {
                        const targetValue = kpi.target || 0;
                        const progress = targetValue ? (kpiData[kpi.id].achieved / targetValue) * 100 : 0;
                        return (
                          <>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#9C8162]">Progress</span>
                        <span className="text-xs font-semibold text-[#36454F]">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#F4ECE2]">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                          progress >= 100
                              ? 'bg-green-500'
                            : progress >= 75
                              ? 'bg-[#6F4E37]'
                              : 'bg-yellow-500'
                          }`}
                          style={{
                          width: `${Math.min(progress, 100)}%`,
                          }}
                        />
                      </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Reflection Section */}
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#36454F]">Self-Reflection</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#36454F]">
                  Key Accomplishments <span className="text-red-500">*</span>
                </label>
                <p className="mt-1 text-xs text-[#6F4E37]">
                  What are your major achievements during this review period?
                </p>
                <textarea
                  {...register('accomplishments')}
                  rows={4}
                  placeholder="Describe significant projects completed, goals achieved, positive impact created..."
                  className="mt-2 w-full rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm focus:border-[#6F4E37] focus:outline-none focus:ring-2 focus:ring-[#6F4E37]/20"
                />
                {errors.accomplishments && (
                  <p className="mt-1 text-xs text-red-600">{errors.accomplishments.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#36454F]">
                  Challenges Faced <span className="text-red-500">*</span>
                </label>
                <p className="mt-1 text-xs text-[#6F4E37]">
                  What obstacles did you encounter and how did you address them?
                </p>
                <textarea
                  {...register('challenges')}
                  rows={3}
                  placeholder="Describe difficulties, setbacks, and how you overcame them..."
                  className="mt-2 w-full rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm focus:border-[#6F4E37] focus:outline-none focus:ring-2 focus:ring-[#6F4E37]/20"
                />
                {errors.challenges && (
                  <p className="mt-1 text-xs text-red-600">{errors.challenges.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#36454F]">
                  Development Needs <span className="text-red-500">*</span>
                </label>
                <p className="mt-1 text-xs text-[#6F4E37]">
                  What skills or knowledge do you need to develop further?
                </p>
                <textarea
                  {...register('developmentNeeds')}
                  rows={3}
                  placeholder="Identify areas for growth, training needs, skills to acquire..."
                  className="mt-2 w-full rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm focus:border-[#6F4E37] focus:outline-none focus:ring-2 focus:ring-[#6F4E37]/20"
                />
                {errors.developmentNeeds && (
                  <p className="mt-1 text-xs text-red-600">{errors.developmentNeeds.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#36454F]">
                  Additional Comments (Optional)
                </label>
                <textarea
                  {...register('comments')}
                  rows={3}
                  placeholder="Any other feedback or information you'd like to share..."
                  className="mt-2 w-full rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm focus:border-[#6F4E37] focus:outline-none focus:ring-2 focus:ring-[#6F4E37]/20"
                />
              </div>
            </div>
          </div>

          {/* Submit Section */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="rounded-lg border border-[#E8DCC4] px-6 py-2 text-sm font-medium text-[#6F4E37] hover:bg-[#F4ECE2] transition-colors"
            >
              Save Draft
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#6F4E37] px-6 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C] disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Self-Assessment'}
            </button>
          </div>
          </form>
        )}
      </div>
    </div>
  );
}
