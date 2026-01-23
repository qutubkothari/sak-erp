'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const assessmentSchema = z.object({
  competencyRatings: z.record(z.string(), z.number().min(1).max(5)),
  meritRatings: z.record(z.string(), z.number().min(1).max(5)),
  demeritRatings: z.record(z.string(), z.number().min(1).max(5)),
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
  category?: string | null;
  frequency?: string | null;
  dataSource?: string | null;
}

interface MeritDemerit {
  id: string;
  name: string;
  description?: string | null;
  weight?: number | null;
  type: 'MERIT' | 'DEMERIT';
}

interface ReviewCycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  selfAssessmentDeadline?: string | null;
  status: string;
}

interface EvaluationSummary {
  id: string;
  status: string;
  cycle?: ReviewCycle | null;
  items?: EvaluationItem[];
}

interface EvaluationItem {
  id: string;
  type: 'COMPETENCY' | 'KPI' | 'MERIT' | 'DEMERIT';
  competencyId?: string | null;
  kpiId?: string | null;
  meritDemeritId?: string | null;
  selfScore?: number | null;
  comments?: string | null;
}

interface EvidenceItem {
  id?: string;
  title: string;
  url: string;
  notes?: string | null;
  stage?: 'SELF_ASSESSMENT' | 'MANAGER_REVIEW' | 'HR_REVIEW';
  uploadedBy?: { firstName?: string; lastName?: string } | null;
  createdAt?: string | null;
  isNew?: boolean;
}

export default function SelfAssessmentPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [cycle, setCycle] = useState<ReviewCycle | null>(null);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [merits, setMerits] = useState<MeritDemerit[]>([]);
  const [demerits, setDemerits] = useState<MeritDemerit[]>([]);
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationSummary[]>([]);
  const [activeEvaluation, setActiveEvaluation] = useState<EvaluationSummary | null>(null);
  const [tab, setTab] = useState<'open' | 'submitted'>('open');
  const [loading, setLoading] = useState(true);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [evidenceDraft, setEvidenceDraft] = useState({ title: '', url: '', notes: '' });
  const [activityItems, setActivityItems] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [formErrorSummary, setFormErrorSummary] = useState('');

  const [selectedRating, setSelectedRating] = useState<{ [key: string]: number }>({});
  const [selectedMeritRating, setSelectedMeritRating] = useState<{ [key: string]: number }>({});
  const [selectedDemeritRating, setSelectedDemeritRating] = useState<{ [key: string]: number }>({});
  const [kpiData, setKpiData] = useState<{ [key: string]: { achieved: number; evidence: string } }>({});

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    getValues,
    reset,
  } = useForm<AssessmentFormData>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      competencyRatings: {},
      meritRatings: {},
      demeritRatings: {},
      kpiAchievements: {},
    },
  });

  const handleRatingClick = (competencyId: string, rating: number) => {
    setSelectedRating({ ...selectedRating, [competencyId]: rating });
    setValue(`competencyRatings.${competencyId}`, rating);
  };

  const handleMeritRatingClick = (meritId: string, rating: number) => {
    setSelectedMeritRating({ ...selectedMeritRating, [meritId]: rating });
    setValue(`meritRatings.${meritId}`, rating);
  };

  const handleDemeritRatingClick = (demeritId: string, rating: number) => {
    setSelectedDemeritRating({ ...selectedDemeritRating, [demeritId]: rating });
    setValue(`demeritRatings.${demeritId}`, rating);
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

  const addEvidenceItem = () => {
    if (!evidenceDraft.title || !evidenceDraft.url) {
      toast.error('Evidence title and URL are required');
      return;
    }

    setEvidenceItems((prev) => [
      {
        title: evidenceDraft.title,
        url: evidenceDraft.url,
        notes: evidenceDraft.notes,
        stage: 'SELF_ASSESSMENT',
        isNew: true,
      },
      ...prev,
    ]);
    setEvidenceDraft({ title: '', url: '', notes: '' });
  };

  const upsertEvaluationItems = async (
    competencyEntries: Array<[string, number]>,
    meritEntries: Array<[string, number]>,
    demeritEntries: Array<[string, number]>,
    kpiEntries: Array<[string, { achieved: number; evidence: string }]>
  ) => {
    if (!evaluationId) return;
    const existingItems = activeEvaluation?.items || [];

    await Promise.all([
      ...competencyEntries.map(([competencyId, rating]) => {
        const existing = existingItems.find((item) => item.competencyId === competencyId);
        if (existing?.id) {
          return fetch(`/api/evaluations/${evaluationId}/items`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId: existing.id,
              selfScore: rating,
            }),
          });
        }
        return fetch(`/api/evaluations/${evaluationId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'COMPETENCY',
            competencyId,
            selfScore: rating,
          }),
        });
      }),
      ...meritEntries.map(([meritId, rating]) => {
        const existing = existingItems.find((item) => item.meritDemeritId === meritId);
        if (existing?.id) {
          return fetch(`/api/evaluations/${evaluationId}/items`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId: existing.id,
              selfScore: rating,
            }),
          });
        }
        return fetch(`/api/evaluations/${evaluationId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'MERIT',
            meritDemeritId: meritId,
            selfScore: rating,
          }),
        });
      }),
      ...demeritEntries.map(([demeritId, rating]) => {
        const existing = existingItems.find((item) => item.meritDemeritId === demeritId);
        if (existing?.id) {
          return fetch(`/api/evaluations/${evaluationId}/items`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId: existing.id,
              selfScore: rating,
            }),
          });
        }
        return fetch(`/api/evaluations/${evaluationId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'DEMERIT',
            meritDemeritId: demeritId,
            selfScore: rating,
          }),
        });
      }),
      ...kpiEntries.map(([kpiId, payload]) => {
        const existing = existingItems.find((item) => item.kpiId === kpiId);
        if (existing?.id) {
          return fetch(`/api/evaluations/${evaluationId}/items`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId: existing.id,
              selfScore: payload.achieved,
              comments: payload.evidence,
            }),
          });
        }
        return fetch(`/api/evaluations/${evaluationId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'KPI',
            kpiId,
            selfScore: payload.achieved,
            comments: payload.evidence,
          }),
        });
      }),
    ]);
  };

  const onSubmit = async (data: AssessmentFormData) => {
    try {
      setFormErrorSummary('');
      if (!evaluationId) {
        toast.error('Evaluation not ready. Please refresh and try again.');
        return;
      }

      const competencyEntries = Object.entries(data.competencyRatings || {});
      const meritEntries = Object.entries(data.meritRatings || {});
      const demeritEntries = Object.entries(data.demeritRatings || {});
      const kpiEntries = Object.entries(data.kpiAchievements || {});

      await upsertEvaluationItems(competencyEntries, meritEntries, demeritEntries, kpiEntries);

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

      const newEvidence = evidenceItems.filter((item) => item.isNew);
      if (newEvidence.length > 0) {
        await Promise.all(
          newEvidence.map((item) =>
            fetch(`/api/evaluations/${evaluationId}/evidence`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: item.title,
                url: item.url,
                notes: item.notes,
                stage: 'SELF_ASSESSMENT',
                uploadedById: session?.user?.employeeId,
              }),
            })
          )
        );
        setEvidenceItems((prev) => prev.map((item) => ({ ...item, isNew: false })));
      }

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

  const handleSaveDraft = async () => {
    if (!evaluationId) {
      toast.error('Evaluation not ready. Please refresh and try again.');
      return;
    }

    try {
      setFormErrorSummary('');
      setDraftSaving(true);
      const values = getValues();
      const competencyEntries = Object.entries(values.competencyRatings || {});
      const meritEntries = Object.entries(values.meritRatings || {});
      const demeritEntries = Object.entries(values.demeritRatings || {});
      const kpiEntries = Object.entries(values.kpiAchievements || {});

      await upsertEvaluationItems(competencyEntries, meritEntries, demeritEntries, kpiEntries);

      await fetch('/api/self-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluationId,
          accomplishments: values.accomplishments || '',
          challenges: values.challenges || '',
          developmentNeeds: values.developmentNeeds || '',
          comments: values.comments || '',
          submit: false,
        }),
      });

      toast.success('Draft saved');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save draft');
    } finally {
      setDraftSaving(false);
    }
  };

  const onSubmitError = (formErrors: FieldErrors<AssessmentFormData>) => {
    const hasKpiErrors = !!formErrors.kpiAchievements && Object.keys(formErrors.kpiAchievements).length > 0;
    const hasCompetencyErrors = !!formErrors.competencyRatings && Object.keys(formErrors.competencyRatings).length > 0;
    const hasMeritErrors = !!formErrors.meritRatings && Object.keys(formErrors.meritRatings).length > 0;
    const hasDemeritErrors = !!formErrors.demeritRatings && Object.keys(formErrors.demeritRatings).length > 0;
    const messageParts = ['Please fix the highlighted fields.'];
    const summaryParts: string[] = [];

    if (formErrors.accomplishments) summaryParts.push('Accomplishments (min 50 chars)');
    if (formErrors.challenges) summaryParts.push('Challenges (min 30 chars)');
    if (formErrors.developmentNeeds) summaryParts.push('Development needs (min 30 chars)');
    if (hasCompetencyErrors) {
      messageParts.push('Select ratings for competencies.');
      summaryParts.push('Competency ratings');
    }
    if (hasMeritErrors) {
      messageParts.push('Select ratings for merits.');
      summaryParts.push('Merit ratings');
    }
    if (hasDemeritErrors) {
      messageParts.push('Select ratings for demerits.');
      summaryParts.push('Demerit ratings');
    }
    if (hasKpiErrors) {
      messageParts.push('Provide KPI evidence (min 10 characters).');
      summaryParts.push('KPI evidence');
    }

    if (summaryParts.length > 0) {
      setFormErrorSummary(`Missing or invalid: ${summaryParts.join(', ')}`);
    }

    toast.error(messageParts.join(' '));
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
    const deadline = activeEvaluation?.cycle?.selfAssessmentDeadline || cycle?.selfAssessmentDeadline;
    if (!deadline) return null;
    return Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  }, [activeEvaluation, cycle]);

  const isPastDeadline = useMemo(() => {
    const deadline = activeEvaluation?.cycle?.selfAssessmentDeadline || cycle?.selfAssessmentDeadline;
    if (!deadline) return false;
    return Date.now() > new Date(deadline).getTime();
  }, [activeEvaluation, cycle]);

  const applyEvaluationData = async (evaluation: EvaluationSummary) => {
    setActiveEvaluation(evaluation);
    setEvaluationId(evaluation.id);

    const items: EvaluationItem[] = Array.isArray(evaluation.items) ? evaluation.items : [];
    const ratingMap: Record<string, number> = {};
    const meritMap: Record<string, number> = {};
    const demeritMap: Record<string, number> = {};
    const kpiMap: Record<string, { achieved: number; evidence: string }> = {};

    items.forEach((item) => {
      if (item.type === 'COMPETENCY' && item.competencyId && item.selfScore != null) {
        ratingMap[item.competencyId] = item.selfScore;
      }
      if (item.type === 'MERIT' && item.meritDemeritId && item.selfScore != null) {
        meritMap[item.meritDemeritId] = item.selfScore;
      }
      if (item.type === 'DEMERIT' && item.meritDemeritId && item.selfScore != null) {
        demeritMap[item.meritDemeritId] = item.selfScore;
      }
      if (item.type === 'KPI' && item.kpiId && item.selfScore != null) {
        kpiMap[item.kpiId] = {
          achieved: item.selfScore,
          evidence: item.comments || '',
        };
      }
    });

    setSelectedRating(ratingMap);
    setSelectedMeritRating(meritMap);
    setSelectedDemeritRating(demeritMap);
    setKpiData(kpiMap);

    const assessmentRes = await fetch(`/api/self-assessments?evaluationId=${evaluation.id}`);
    const assessment = await assessmentRes.json();
    if (assessment) {
      reset({
        accomplishments: assessment.accomplishments ?? '',
        challenges: assessment.challenges ?? '',
        developmentNeeds: assessment.developmentNeeds ?? '',
        comments: assessment.comments ?? '',
        competencyRatings: ratingMap,
        meritRatings: meritMap,
        demeritRatings: demeritMap,
        kpiAchievements: kpiMap,
      });
    } else {
      reset({
        competencyRatings: ratingMap,
        meritRatings: meritMap,
        demeritRatings: demeritMap,
        kpiAchievements: kpiMap,
      });
    }

    const evidenceRes = await fetch(`/api/evaluations/${evaluation.id}/evidence`);
    const evidenceData = await evidenceRes.json();
    setEvidenceItems(Array.isArray(evidenceData) ? evidenceData : []);

    setActivityLoading(true);
    const activityRes = await fetch(`/api/evaluations/${evaluation.id}/activity`);
    const activityData = await activityRes.json();
    setActivityItems(Array.isArray(activityData) ? activityData : []);
    setActivityLoading(false);
  };

  const evaluationIdFromQuery = useMemo(
    () => searchParams.get('evaluationId') || '',
    [searchParams]
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [cyclesRes, compsRes, kpisRes, meritsRes, demeritsRes] = await Promise.all([
          fetch('/api/review-cycles'),
          fetch('/api/competencies'),
          fetch('/api/kpis'),
          fetch('/api/merit-demerits?type=MERIT'),
          fetch('/api/merit-demerits?type=DEMERIT'),
        ]);
        const cycles = await cyclesRes.json();
        const comps = await compsRes.json();
        const kpiList = await kpisRes.json();
        const meritList = await meritsRes.json();
        const demeritList = await demeritsRes.json();

        const activeCycle = Array.isArray(cycles)
          ? cycles.find((c) => c.status === 'ACTIVE') || cycles[0]
          : null;
        setCycle(activeCycle || null);
        setCompetencies(Array.isArray(comps) ? comps : []);
        setKpis(Array.isArray(kpiList) ? kpiList : []);
        setMerits(Array.isArray(meritList) ? meritList : []);
        setDemerits(Array.isArray(demeritList) ? demeritList : []);

        const employeeId = session?.user?.employeeId;
        if (!employeeId) return;

        const evaluationsRes = await fetch('/api/evaluations');
        const evaluationsData = await evaluationsRes.json();
        const employeeEvaluations: EvaluationSummary[] = Array.isArray(evaluationsData)
          ? evaluationsData.filter((e) => e.employeeId === employeeId)
          : [];

        setEvaluations(employeeEvaluations);

        const openStatuses = new Set(['SELF_REVIEW', 'DRAFT']);
        let current = evaluationIdFromQuery
          ? employeeEvaluations.find((e) => e.id === evaluationIdFromQuery)
          : undefined;

        if (!current && activeCycle?.id) {
          current = employeeEvaluations.find(
            (e) => e.cycle?.id === activeCycle.id && openStatuses.has(e.status)
          );
        }

        if (!current) {
          current = employeeEvaluations.find((e) => openStatuses.has(e.status)) || employeeEvaluations[0];
        }

        if (!current && activeCycle?.id) {
          const created = await (await fetch('/api/evaluations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId, cycleId: activeCycle.id }),
          })).json();

          const refreshRes = await fetch('/api/evaluations');
          const refreshData = await refreshRes.json();
          const refreshed: EvaluationSummary[] = Array.isArray(refreshData)
            ? refreshData.filter((e) => e.employeeId === employeeId)
            : [];
          setEvaluations(refreshed);
          current = refreshed.find((e) => e.id === created?.id) || created;
        }

        if (!current && !activeCycle?.id) {
          toast.error('No active review cycle found. Contact HR to open a cycle.');
          return;
        }

        if (current?.id) {
          await applyEvaluationData(current);
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
  }, [session?.user, reset, evaluationIdFromQuery]);

  return (
    <div className="min-h-screen bg-[#F7F4EF] p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#36454F]">Self-Assessment</h1>
          <p className="mt-1 text-sm text-[#6F4E37]">
            {cycle
              ? `${cycle.name}${
                  cycle.selfAssessmentDeadline
                    ? ` • Due ${new Date(cycle.selfAssessmentDeadline).toLocaleDateString()}`
                    : ' • No deadline set'
                }`
              : 'Loading cycle...'}
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
            <li>• Capture merit contributions and demerit areas using the same scale</li>
            <li>• Provide evidence for your KPI achievements</li>
            <li>• Reflect on accomplishments, challenges, and development needs</li>
            <li>• Your manager will review and provide their assessment</li>
            <li>• Be specific and provide concrete examples</li>
          </ul>
        </div>

        {isPastDeadline && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            The self-assessment deadline has passed. Submissions are locked.
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-8 text-center text-sm text-[#9C8162]">
            Loading assessment...
          </div>
        ) : (
          <>
            <div className="mb-6 rounded-2xl border border-[#E8DCC4] bg-white p-4 shadow-sm">
              <div className="flex gap-2">
                {(['open', 'submitted'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTab(item)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      tab === item
                        ? 'bg-[#6F4E37] text-white'
                        : 'bg-white text-[#6F4E37] border border-[#E8DCC4] hover:bg-[#F4ECE2]'
                    }`}
                  >
                    {item === 'open' ? 'Open Assessments' : 'Submitted Assessments'}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                {tab === 'open' ? (
                  evaluations.filter((e) => ['SELF_REVIEW', 'DRAFT'].includes(e.status)).length === 0 ? (
                    <p className="text-sm text-[#9C8162]">No open assessments right now.</p>
                  ) : (
                    evaluations
                      .filter((e) => ['SELF_REVIEW', 'DRAFT'].includes(e.status))
                      .map((evaluation) => (
                        <button
                          key={evaluation.id}
                          type="button"
                          onClick={() => applyEvaluationData(evaluation)}
                          className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                            activeEvaluation?.id === evaluation.id
                              ? 'border-[#6F4E37] bg-[#F4ECE2]'
                              : 'border-[#E8DCC4] bg-white hover:bg-[#F7F4EF]'
                          }`}
                        >
                          <span className="font-medium text-[#36454F]">
                            {evaluation.cycle?.name || 'Assessment'}
                          </span>
                          <span className="text-xs text-[#9C8162]">{evaluation.status}</span>
                        </button>
                      ))
                  )
                ) : evaluations.filter((e) => !['SELF_REVIEW', 'DRAFT'].includes(e.status)).length === 0 ? (
                  <p className="text-sm text-[#9C8162]">No submitted assessments yet.</p>
                ) : (
                  evaluations
                    .filter((e) => !['SELF_REVIEW', 'DRAFT'].includes(e.status))
                    .map((evaluation) => (
                      <button
                        key={evaluation.id}
                        type="button"
                        onClick={() => applyEvaluationData(evaluation)}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                          activeEvaluation?.id === evaluation.id
                            ? 'border-[#6F4E37] bg-[#F4ECE2]'
                            : 'border-[#E8DCC4] bg-white hover:bg-[#F7F4EF]'
                        }`}
                      >
                        <span className="font-medium text-[#36454F]">
                          {evaluation.cycle?.name || 'Assessment'}
                        </span>
                        <span className="text-xs text-[#9C8162]">{evaluation.status}</span>
                      </button>
                    ))
                )}
              </div>
            </div>

            {activeEvaluation && !['SELF_REVIEW', 'DRAFT'].includes(activeEvaluation.status) && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                This assessment is submitted. You can view it, but changes are locked.
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit, onSubmitError)} className="space-y-6">
              {formErrorSummary ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formErrorSummary}
                </div>
              ) : null}
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

          {/* Merits Section */}
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#36454F]">Merits</h2>
            <p className="mb-6 text-sm text-[#6F4E37]">
              Highlight merit-based contributions (1 = Needs Improvement, 5 = Outstanding)
            </p>

            <div className="space-y-6">
              {merits.map((entry) => (
                <div key={entry.id} className="border-b border-[#F4ECE2] pb-6 last:border-0 last:pb-0">
                  <div className="mb-3">
                    <h3 className="font-semibold text-[#36454F]">{entry.name}</h3>
                    <p className="text-xs text-[#6F4E37]">{entry.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleMeritRatingClick(entry.id, rating)}
                        className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 text-lg font-bold transition-all ${
                          selectedMeritRating[entry.id] === rating
                            ? 'border-[#6F4E37] bg-[#6F4E37] text-white scale-110'
                            : 'border-[#E8DCC4] bg-white text-[#9C8162] hover:border-[#6F4E37] hover:bg-[#F4ECE2]'
                        }`}
                      >
                        {rating}
                      </button>
                    ))}
                    {selectedMeritRating[entry.id] && (
                      <span className="ml-4 text-sm font-medium text-[#6F4E37]">
                        {getRatingLabel(selectedMeritRating[entry.id])}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Demerits Section */}
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#36454F]">Demerits</h2>
            <p className="mb-6 text-sm text-[#6F4E37]">
              Identify demerit areas that need improvement (1 = Needs Improvement, 5 = Outstanding)
            </p>

            <div className="space-y-6">
              {demerits.map((entry) => (
                <div key={entry.id} className="border-b border-[#F4ECE2] pb-6 last:border-0 last:pb-0">
                  <div className="mb-3">
                    <h3 className="font-semibold text-[#36454F]">{entry.name}</h3>
                    <p className="text-xs text-[#6F4E37]">{entry.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleDemeritRatingClick(entry.id, rating)}
                        className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 text-lg font-bold transition-all ${
                          selectedDemeritRating[entry.id] === rating
                            ? 'border-[#6F4E37] bg-[#6F4E37] text-white scale-110'
                            : 'border-[#E8DCC4] bg-white text-[#9C8162] hover:border-[#6F4E37] hover:bg-[#F4ECE2]'
                        }`}
                      >
                        {rating}
                      </button>
                    ))}
                    {selectedDemeritRating[entry.id] && (
                      <span className="ml-4 text-sm font-medium text-[#6F4E37]">
                        {getRatingLabel(selectedDemeritRating[entry.id])}
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
                  {kpi.category || kpi.frequency || kpi.dataSource ? (
                    <p className="mb-3 text-[11px] text-[#9C8162]">
                      {[kpi.category ? `Category: ${kpi.category}` : null,
                        kpi.frequency ? `Frequency: ${kpi.frequency}` : null,
                        kpi.dataSource ? `Source: ${kpi.dataSource}` : null]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  ) : null}

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
                      {errors.kpiAchievements?.[kpi.id]?.achieved && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.kpiAchievements?.[kpi.id]?.achieved?.message as string}
                        </p>
                      )}
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
                      {errors.kpiAchievements?.[kpi.id]?.evidence && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.kpiAchievements?.[kpi.id]?.evidence?.message as string}
                        </p>
                      )}
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

          {/* Evidence Attachments */}
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#36454F]">Evidence Attachments</h2>
            <p className="mb-4 text-sm text-[#6F4E37]">
              Add links to supporting documents (reports, dashboards, certificates, emails).
            </p>

            <div className="grid gap-3 md:grid-cols-3">
              <input
                type="text"
                placeholder="Evidence title"
                value={evidenceDraft.title}
                onChange={(e) => setEvidenceDraft({ ...evidenceDraft, title: e.target.value })}
                className="rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm"
              />
              <input
                type="url"
                placeholder="https://..."
                value={evidenceDraft.url}
                onChange={(e) => setEvidenceDraft({ ...evidenceDraft, url: e.target.value })}
                className="rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Notes (optional)"
                value={evidenceDraft.notes}
                onChange={(e) => setEvidenceDraft({ ...evidenceDraft, notes: e.target.value })}
                className="rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={addEvidenceItem}
                className="rounded-lg border border-[#D9CBB6] px-3 py-2 text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
              >
                Add Evidence
              </button>
            </div>

            {evidenceItems.length === 0 ? (
              <p className="mt-4 text-xs text-[#9C8162]">No evidence added yet.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {evidenceItems.map((item, index) => (
                  <div key={item.id ?? `${item.title}-${index}`} className="rounded-lg border border-[#E8DCC4] p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#36454F]">{item.title}</span>
                      <span className="text-[10px] text-[#9C8162]">
                        {item.stage?.replace('_', ' ') || 'SELF ASSESSMENT'}
                      </span>
                    </div>
                    <a className="mt-1 block text-xs text-blue-600 underline" href={item.url} target="_blank" rel="noreferrer">
                      {item.url}
                    </a>
                    {item.notes && <p className="mt-1 text-[10px] text-[#6F4E37]">{item.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Evaluation Activity */}
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#36454F]">Evaluation Activity</h2>
            {activityLoading ? (
              <p className="text-sm text-[#9C8162]">Loading activity...</p>
            ) : activityItems.length === 0 ? (
              <p className="text-sm text-[#9C8162]">No activity logged yet.</p>
            ) : (
              <ul className="space-y-3">
                {activityItems.map((item) => (
                  <li key={item.id} className="rounded-lg border border-[#E8DCC4] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#36454F]">
                        {String(item.action).replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-[#9C8162]">
                        {new Date(item.createdAt).toLocaleString('en-GB')}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-[#9C8162]">by {item.actor?.email || 'System'}</p>
                    {item.details && (
                      <div className="mt-2 text-[10px] text-[#6F4E37]">
                        {item.details.stage && <span>Stage: {item.details.stage} </span>}
                        {item.details.status && <span>Status: {item.details.status} </span>}
                        {item.details.notes && <span>• Notes: {item.details.notes}</span>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
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
              onClick={handleSaveDraft}
              disabled={draftSaving || isPastDeadline}
              className="rounded-lg border border-[#E8DCC4] px-6 py-2 text-sm font-medium text-[#6F4E37] hover:bg-[#F4ECE2] transition-colors disabled:opacity-50"
            >
              {draftSaving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                isPastDeadline ||
                (activeEvaluation ? !['SELF_REVIEW', 'DRAFT'].includes(activeEvaluation.status) : false)
              }
              className="rounded-lg bg-[#6F4E37] px-6 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C] disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Self-Assessment'}
            </button>
          </div>
          </form>
          </>
        )}
      </div>
    </div>
  );
}
