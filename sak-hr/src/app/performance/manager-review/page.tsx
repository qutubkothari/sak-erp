'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

const managerReviewSchema = z.object({
  competencyRatings: z.record(z.string(), z.number().min(1).max(5)),
  meritRatings: z.record(z.string(), z.number().min(1).max(5)),
  demeritRatings: z.record(z.string(), z.number().min(1).max(5)),
  kpiRatings: z.record(z.string(), z.number().min(1).max(5)),
  overallRating: z.number().min(1).max(5),
  managerComments: z.string().min(50, 'Please provide detailed feedback (minimum 50 characters)'),
  strengths: z.string().min(30, 'Please describe employee strengths (minimum 30 characters)'),
  areasForImprovement: z.string().min(30, 'Please describe areas for improvement (minimum 30 characters)'),
  developmentPlan: z.string().min(50, 'Please outline development plan (minimum 50 characters)'),
  salaryRecommendation: z.enum(['no-change', 'increase', 'promotion']),
  salaryIncreasePercent: z.number().min(0).max(100).optional(),
  recommendedPromotion: z.string().optional(),
});

type ManagerReviewFormData = z.infer<typeof managerReviewSchema>;

interface Employee {
  id: string;
  name: string;
  position?: string | null;
  department?: string | null;
  joinDate?: string | null;
}

interface EmployeeRecord {
  id: string;
  managerId?: string | null;
}

interface SelfAssessment {
  competencyRatings: { [key: string]: number };
  accomplishments: string;
  challenges: string;
  developmentNeeds: string;
}

interface Competency {
  id: string;
  name: string;
  description?: string | null;
  selfRating?: number | null;
  itemId?: string | null;
}

interface MeritDemerit {
  id: string;
  name: string;
  description?: string | null;
  selfRating?: number | null;
  itemId?: string | null;
}

interface KPIProgress {
  id: string;
  name: string;
  target?: number | null;
  unit?: string | null;
  category?: string | null;
  frequency?: string | null;
  dataSource?: string | null;
  achieved?: number | null;
  progress?: number | null;
  itemId?: string | null;
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

export default function ManagerReviewPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [selfAssessment, setSelfAssessment] = useState<SelfAssessment | null>(null);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [merits, setMerits] = useState<MeritDemerit[]>([]);
  const [demerits, setDemerits] = useState<MeritDemerit[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [evidenceDraft, setEvidenceDraft] = useState({ title: '', url: '', notes: '' });

  const rawRole = (session?.user?.role || 'employee').toString().toLowerCase();
  const baseRole = rawRole === 'hr' ? 'admin' : rawRole;
  const [hasDirectReports, setHasDirectReports] = useState(false);
  const [checkingReports, setCheckingReports] = useState(baseRole === 'manager');
  const canAccess = baseRole === 'admin' || (baseRole === 'manager' && hasDirectReports);

  useEffect(() => {
    const managerId = session?.user?.employeeId;
    if (baseRole !== 'manager' || !managerId) {
      setHasDirectReports(false);
      setCheckingReports(false);
      return;
    }

    let active = true;
    setCheckingReports(true);
    fetch(`/api/employees?managerId=${managerId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setHasDirectReports(Array.isArray(data) && data.length > 0);
      })
      .catch(() => {
        if (!active) return;
        setHasDirectReports(false);
      })
      .finally(() => {
        if (!active) return;
        setCheckingReports(false);
      });

    return () => {
      active = false;
    };
  }, [baseRole, session?.user?.employeeId]);

  const [kpiProgress, setKpiProgress] = useState<KPIProgress[]>([]);
  const [activityItems, setActivityItems] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const [managerRatings, setManagerRatings] = useState<{ [key: string]: number }>({});
  const [managerMeritRatings, setManagerMeritRatings] = useState<{ [key: string]: number }>({});
  const [managerDemeritRatings, setManagerDemeritRatings] = useState<{ [key: string]: number }>({});
  const [managerKpiRatings, setManagerKpiRatings] = useState<{ [key: string]: number }>({});
  const [salaryRec, setSalaryRec] = useState<string>('no-change');
  const [overallRating, setOverallRating] = useState<number>(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<ManagerReviewFormData>({
    resolver: zodResolver(managerReviewSchema),
    defaultValues: {
      meritRatings: {},
      demeritRatings: {},
      kpiRatings: {},
      salaryRecommendation: 'no-change',
    },
  });

  const salaryRecommendation = watch('salaryRecommendation');

  const selectedEvaluation = useMemo(
    () => evaluations.find((e) => e.id === selectedEvaluationId),
    [evaluations, selectedEvaluationId]
  );

  const evaluationIdFromQuery = useMemo(() => searchParams.get('evaluationId') || '', [searchParams]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [evaluationsRes, employeesRes] = await Promise.all([
          fetch('/api/evaluations'),
          fetch('/api/employees'),
        ]);
        const evals = await evaluationsRes.json();
        const employees = await employeesRes.json();

        const evaluationList = Array.isArray(evals) ? evals : [];
        const employeeList = Array.isArray(employees) ? employees : [];
        const managerId = session?.user?.employeeId;

        const managedIds = new Set(
          (employeeList as EmployeeRecord[])
            .filter((emp) => emp.managerId === managerId)
            .map((emp) => emp.id)
        );

        const list = evaluationList.filter(
          (evaluation: any) => managedIds.has(evaluation.employeeId) && evaluation.status === 'MANAGER_REVIEW'
        );

        setEvaluations(list);
        if (list.length) {
          const preferred = evaluationIdFromQuery && list.find((evaluation: any) => evaluation.id === evaluationIdFromQuery);
          setSelectedEvaluationId(preferred ? preferred.id : list[0].id);
        } else {
          setSelectedEvaluationId('');
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to load evaluations');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [evaluationIdFromQuery, session?.user?.employeeId, canAccess]);

  useEffect(() => {
    const loadEvaluationDetails = async () => {
      if (!selectedEvaluationId) return;
      try {
        const evaluationRes = await fetch(`/api/evaluations/${selectedEvaluationId}`);
        const evaluation = await evaluationRes.json();

        if (evaluation?.employee) {
          setEmployee({
            id: evaluation.employee.id,
            name: `${evaluation.employee.firstName} ${evaluation.employee.lastName}`,
            position: evaluation.employee.role?.title || null,
            department: evaluation.employee.department?.name || null,
            joinDate: evaluation.employee.hireDate || null,
          });
        }

        const assessmentRes = await fetch(`/api/self-assessments?evaluationId=${selectedEvaluationId}`);
        const assessment = await assessmentRes.json();
        if (assessment) {
          setSelfAssessment({
            competencyRatings: {},
            accomplishments: assessment.accomplishments ?? '',
            challenges: assessment.challenges ?? '',
            developmentNeeds: assessment.developmentNeeds ?? '',
          });
        }

        const [compsRes, kpisRes, meritsRes, demeritsRes] = await Promise.all([
          fetch('/api/competencies'),
          fetch('/api/kpis'),
          fetch('/api/merit-demerits?type=MERIT'),
          fetch('/api/merit-demerits?type=DEMERIT'),
        ]);
        const comps = await compsRes.json();
        const kpis = await kpisRes.json();
        const meritsData = await meritsRes.json();
        const demeritsData = await demeritsRes.json();
        const compList = Array.isArray(comps) ? comps : [];
        const kpiList = Array.isArray(kpis) ? kpis : [];
        const meritList = Array.isArray(meritsData) ? meritsData : [];
        const demeritList = Array.isArray(demeritsData) ? demeritsData : [];
        const items = Array.isArray(evaluation?.items) ? evaluation.items : [];

        const competencyManagerRatings: Record<string, number> = {};
        const meritManagerRatings: Record<string, number> = {};
        const demeritManagerRatings: Record<string, number> = {};
        const kpiManagerRatings: Record<string, number> = {};

        const mapped = compList.map((comp: any) => {
          const item = items.find((it: any) => it.competencyId === comp.id);
          if (item?.managerScore != null) {
            competencyManagerRatings[comp.id] = item.managerScore;
          }
          return {
            id: comp.id,
            name: comp.name,
            description: comp.description,
            selfRating: item?.selfScore ?? null,
            itemId: item?.id ?? null,
          };
        });
        setCompetencies(mapped);

        const meritMapped = meritList.map((entry: any) => {
          const item = items.find((it: any) => it.meritDemeritId === entry.id && it.type === 'MERIT');
          if (item?.managerScore != null) {
            meritManagerRatings[entry.id] = item.managerScore;
          }
          return {
            id: entry.id,
            name: entry.name,
            description: entry.description,
            selfRating: item?.selfScore ?? null,
            itemId: item?.id ?? null,
          };
        });
        setMerits(meritMapped);

        const demeritMapped = demeritList.map((entry: any) => {
          const item = items.find((it: any) => it.meritDemeritId === entry.id && it.type === 'DEMERIT');
          if (item?.managerScore != null) {
            demeritManagerRatings[entry.id] = item.managerScore;
          }
          return {
            id: entry.id,
            name: entry.name,
            description: entry.description,
            selfRating: item?.selfScore ?? null,
            itemId: item?.id ?? null,
          };
        });
        setDemerits(demeritMapped);

        const kpiMapped = kpiList.map((kpi: any) => {
          const item = items.find((it: any) => it.kpiId === kpi.id);
          const achieved = item?.selfScore ?? null;
          const target = kpi.target ?? null;
          const progress = target && achieved != null ? Math.min((achieved / target) * 100, 200) : null;
          if (item?.managerScore != null) {
            kpiManagerRatings[kpi.id] = item.managerScore;
          }
          return {
            id: kpi.id,
            name: kpi.name,
            target: kpi.target ?? null,
            unit: kpi.unit ?? null,
            category: kpi.category ?? null,
            frequency: kpi.frequency ?? null,
            dataSource: kpi.dataSource ?? null,
            achieved,
            progress,
            itemId: item?.id ?? null,
          };
        });
        setKpiProgress(kpiMapped);

        setManagerRatings(competencyManagerRatings);
        setManagerMeritRatings(meritManagerRatings);
        setManagerDemeritRatings(demeritManagerRatings);
        setManagerKpiRatings(kpiManagerRatings);
        setValue('competencyRatings', competencyManagerRatings);
        setValue('meritRatings', meritManagerRatings);
        setValue('demeritRatings', demeritManagerRatings);
        setValue('kpiRatings', kpiManagerRatings);

        const evidenceRes = await fetch(`/api/evaluations/${selectedEvaluationId}/evidence`);
        const evidenceData = await evidenceRes.json();
        setEvidenceItems(Array.isArray(evidenceData) ? evidenceData : []);

        setActivityLoading(true);
        const activityRes = await fetch(`/api/evaluations/${selectedEvaluationId}/activity`);
        const activityData = await activityRes.json();
        setActivityItems(Array.isArray(activityData) ? activityData : []);
        setActivityLoading(false);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load evaluation details');
        setActivityLoading(false);
      }
    };

    loadEvaluationDetails();
  }, [selectedEvaluationId, setValue]);

  // Render loading/access states after all hooks
  if (checkingReports && baseRole === 'manager') {
    return <div className="py-16 text-center text-sm text-[#9C8162]">Checking access...</div>;
  }

  if (!canAccess) {
    return <div className="py-16 text-center text-sm text-[#9C8162]">Access denied.</div>;
  }

  const handleRatingClick = (competencyId: string, rating: number) => {
    setManagerRatings({ ...managerRatings, [competencyId]: rating });
    setValue(`competencyRatings.${competencyId}`, rating);
  };

  const handleMeritRatingClick = (meritId: string, rating: number) => {
    setManagerMeritRatings({ ...managerMeritRatings, [meritId]: rating });
    setValue(`meritRatings.${meritId}`, rating);
  };

  const handleDemeritRatingClick = (demeritId: string, rating: number) => {
    setManagerDemeritRatings({ ...managerDemeritRatings, [demeritId]: rating });
    setValue(`demeritRatings.${demeritId}`, rating);
  };

  const handleKpiRatingClick = (kpiId: string, rating: number) => {
    setManagerKpiRatings({ ...managerKpiRatings, [kpiId]: rating });
    setValue(`kpiRatings.${kpiId}`, rating);
  };

  const handleOverallRating = (rating: number) => {
    setOverallRating(rating);
    setValue('overallRating', rating);
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
        stage: 'MANAGER_REVIEW',
        isNew: true,
      },
      ...prev,
    ]);
    setEvidenceDraft({ title: '', url: '', notes: '' });
  };

  const onSubmit = async (data: ManagerReviewFormData) => {
    try {
      if (!selectedEvaluationId) {
        toast.error('Please select an evaluation.');
        return;
      }

      const managerId = session?.user?.employeeId || undefined;

      await Promise.all(
        [
          ...Object.entries(data.competencyRatings || {}).map(([competencyId, rating]) => {
            const item = competencies.find((c) => c.id === competencyId);
            if (!item?.itemId) {
              return fetch(`/api/evaluations/${selectedEvaluationId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'COMPETENCY',
                  competencyId,
                  managerScore: rating,
                }),
              });
            }
            return fetch(`/api/evaluations/${selectedEvaluationId}/items`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                itemId: item.itemId,
                managerScore: rating,
              }),
            });
          }),
          ...Object.entries(data.meritRatings || {}).map(([meritId, rating]) => {
            const item = merits.find((m) => m.id === meritId);
            if (!item?.itemId) {
              return fetch(`/api/evaluations/${selectedEvaluationId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'MERIT',
                  meritDemeritId: meritId,
                  managerScore: rating,
                }),
              });
            }
            return fetch(`/api/evaluations/${selectedEvaluationId}/items`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                itemId: item.itemId,
                managerScore: rating,
              }),
            });
          }),
          ...Object.entries(data.demeritRatings || {}).map(([demeritId, rating]) => {
            const item = demerits.find((m) => m.id === demeritId);
            if (!item?.itemId) {
              return fetch(`/api/evaluations/${selectedEvaluationId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'DEMERIT',
                  meritDemeritId: demeritId,
                  managerScore: rating,
                }),
              });
            }
            return fetch(`/api/evaluations/${selectedEvaluationId}/items`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                itemId: item.itemId,
                managerScore: rating,
              }),
            });
          }),
          ...Object.entries(data.kpiRatings || {}).map(([kpiId, rating]) => {
            const item = kpiProgress.find((kpi) => kpi.id === kpiId);
            if (!item?.itemId) {
              return fetch(`/api/evaluations/${selectedEvaluationId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'KPI',
                  kpiId,
                  managerScore: rating,
                }),
              });
            }
            return fetch(`/api/evaluations/${selectedEvaluationId}/items`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                itemId: item.itemId,
                managerScore: rating,
              }),
            });
          }),
        ]
      );

      await fetch('/api/manager-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluationId: selectedEvaluationId,
          managerId,
          overallRating: data.overallRating,
          managerComments: data.managerComments,
          strengths: data.strengths,
          areasForImprovement: data.areasForImprovement,
          developmentPlan: data.developmentPlan,
          salaryRecommendation: data.salaryRecommendation,
          salaryIncreasePercent: data.salaryIncreasePercent,
          recommendedPromotion: data.recommendedPromotion,
        }),
      });

      const newEvidence = evidenceItems.filter((item) => item.isNew);
      if (newEvidence.length > 0) {
        await Promise.all(
          newEvidence.map((item) =>
            fetch(`/api/evaluations/${selectedEvaluationId}/evidence`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: item.title,
                url: item.url,
                notes: item.notes,
                stage: 'MANAGER_REVIEW',
                uploadedById: managerId,
              }),
            })
          )
        );
        setEvidenceItems((prev) => prev.map((item) => ({ ...item, isNew: false })));
      }

      await fetch(`/api/evaluations/${selectedEvaluationId}/approvals`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'MANAGER',
          status: 'APPROVED',
          approverId: managerId,
          notes: 'Manager review submitted',
        }),
      });

      await fetch(`/api/evaluations/${selectedEvaluationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'HR_REVIEW',
          managerScore: data.overallRating,
          finalRating: data.overallRating,
        }),
      });

      toast.success('Manager review submitted successfully');
    } catch (error) {
      toast.error('Failed to submit review');
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

  const getRatingColor = (rating?: number | null) => {
    if (!rating) return 'text-[#9C8162]';
    if (rating >= 4) return 'text-green-600';
    if (rating === 3) return 'text-blue-600';
    return 'text-orange-600';
  };

  return (
    <div className="min-h-screen bg-[#F7F4EF] p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#36454F]">Manager Review</h1>
          <p className="mt-1 text-sm text-[#6F4E37]">
            {employee ? `Performance evaluation for ${employee.name}` : 'Select an evaluation to review'}
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-[#E8DCC4] bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs text-[#9C8162]">Evaluation</p>
              <select
                className="mt-2 w-full rounded border border-[#E8DCC4] px-3 py-2 text-sm"
                value={selectedEvaluationId}
                onChange={(e) => setSelectedEvaluationId(e.target.value)}
                disabled={loading}
              >
                {evaluations.map((evaluation) => (
                  <option key={evaluation.id} value={evaluation.id}>
                    {evaluation.employee?.firstName} {evaluation.employee?.lastName} • {evaluation.cycle?.name}
                  </option>
                ))}
              </select>
              {!loading && evaluations.length === 0 && (
                <p className="mt-2 text-xs text-[#9C8162]">No manager reviews pending for your team.</p>
              )}
            </div>
            <div>
              <p className="text-xs text-[#9C8162]">Status</p>
              <p className="mt-2 text-sm font-semibold text-[#36454F]">
                {selectedEvaluation?.status || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#9C8162]">Cycle</p>
              <p className="mt-2 text-sm font-semibold text-[#36454F]">
                {selectedEvaluation?.cycle?.name || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Employee Info Card */}
        <div className="mb-6 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#36454F]">Employee Information</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <span className="text-xs text-[#9C8162]">Name</span>
              <p className="font-semibold text-[#36454F]">{employee?.name || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-[#9C8162]">Position</span>
              <p className="font-semibold text-[#36454F]">{employee?.position || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-[#9C8162]">Department</span>
              <p className="font-semibold text-[#36454F]">{employee?.department || '—'}</p>
            </div>
          </div>
        </div>

        {/* Self-Assessment Summary */}
        <div className="mb-6 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#36454F]">Employee Self-Assessment</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[#36454F]">Key Accomplishments</h3>
              <p className="text-sm text-[#6F4E37]">{selfAssessment?.accomplishments || '—'}</p>
            </div>
            
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[#36454F]">Challenges Faced</h3>
              <p className="text-sm text-[#6F4E37]">{selfAssessment?.challenges || '—'}</p>
            </div>
            
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[#36454F]">Development Needs</h3>
              <p className="text-sm text-[#6F4E37]">{selfAssessment?.developmentNeeds || '—'}</p>
            </div>
          </div>
        </div>

        {/* KPI Progress Summary */}
        <div className="mb-6 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#36454F]">KPI Progress (Auto)</h2>
          {kpiProgress.length === 0 ? (
            <p className="text-sm text-[#9C8162]">No KPI data available.</p>
          ) : (
            <div className="space-y-4">
              {kpiProgress.map((kpi) => (
                <div key={kpi.id} className="border-b border-[#F4ECE2] pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#36454F]">{kpi.name}</p>
                      <p className="text-xs text-[#6F4E37]">
                        Target: {kpi.target ?? '—'}{kpi.unit ?? ''} • Achieved: {kpi.achieved ?? '—'}{kpi.unit ?? ''}
                      </p>
                      {(kpi.category || kpi.frequency || kpi.dataSource) && (
                        <p className="mt-1 text-[11px] text-[#9C8162]">
                          {[kpi.category ? `Category: ${kpi.category}` : null,
                            kpi.frequency ? `Frequency: ${kpi.frequency}` : null,
                            kpi.dataSource ? `Source: ${kpi.dataSource}` : null]
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-[#36454F]">
                      {kpi.progress != null ? `${Math.round(kpi.progress)}%` : '—'}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-[#F4ECE2]">
                    <div
                      className={`h-2 rounded-full ${
                        kpi.progress != null && kpi.progress >= 100
                          ? 'bg-green-500'
                          : kpi.progress != null && kpi.progress >= 75
                            ? 'bg-[#6F4E37]'
                            : 'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min(kpi.progress ?? 0, 100)}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-[#9C8162] w-24">Your Rating:</span>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleKpiRatingClick(kpi.id, rating)}
                        className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 text-sm font-bold transition-all ${
                          managerKpiRatings[kpi.id] === rating
                            ? 'border-[#6F4E37] bg-[#6F4E37] text-white scale-110'
                            : 'border-[#E8DCC4] bg-white text-[#9C8162] hover:border-[#6F4E37] hover:bg-[#F4ECE2]'
                        }`}
                      >
                        {rating}
                      </button>
                    ))}
                    {managerKpiRatings[kpi.id] && (
                      <span className="ml-3 text-sm font-medium text-[#6F4E37]">
                        {getRatingLabel(managerKpiRatings[kpi.id])}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evaluation Activity */}
        <div className="mb-6 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
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

        {/* Evidence Attachments */}
        <div className="mb-6 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#36454F]">Evidence Attachments</h2>
          <p className="mb-4 text-sm text-[#6F4E37]">
            Review employee evidence and add manager evidence links.
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
                      {item.stage?.replace('_', ' ') || 'MANAGER REVIEW'}
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Competency Ratings */}
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#36454F]">Competency Evaluation</h2>
            <p className="mb-6 text-sm text-[#6F4E37]">
              Review employee's self-ratings and provide your assessment
            </p>

            <div className="space-y-6">
              {competencies.map((comp) => (
                <div key={comp.id} className="border-b border-[#F4ECE2] pb-6 last:border-0 last:pb-0">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#36454F]">{comp.name}</h3>
                      <p className="text-xs text-[#6F4E37]">{comp.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#9C8162]">Employee Rating</p>
                      <p className={`text-lg font-bold ${getRatingColor(comp.selfRating)}`}>
                        {comp.selfRating ?? '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#9C8162] w-24">Your Rating:</span>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleRatingClick(comp.id, rating)}
                        className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 text-lg font-bold transition-all ${
                          managerRatings[comp.id] === rating
                            ? 'border-[#6F4E37] bg-[#6F4E37] text-white scale-110'
                            : 'border-[#E8DCC4] bg-white text-[#9C8162] hover:border-[#6F4E37] hover:bg-[#F4ECE2]'
                        }`}
                      >
                        {rating}
                      </button>
                    ))}
                    {managerRatings[comp.id] && (
                      <span className="ml-4 text-sm font-medium text-[#6F4E37]">
                        {getRatingLabel(managerRatings[comp.id])}
                      </span>
                    )}
                  </div>

                  {managerRatings[comp.id] && comp.selfRating !== managerRatings[comp.id] && (
                    <div className="mt-3 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                      <p className="text-xs text-yellow-800">
                        ⚠️ Rating differs from employee self-assessment. Please provide explanation in manager comments.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Merits */}
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#36454F]">Merit Evaluation</h2>
            <p className="mb-6 text-sm text-[#6F4E37]">Evaluate merit-based contributions</p>

            <div className="space-y-6">
              {merits.map((entry) => (
                <div key={entry.id} className="border-b border-[#F4ECE2] pb-6 last:border-0 last:pb-0">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#36454F]">{entry.name}</h3>
                      <p className="text-xs text-[#6F4E37]">{entry.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#9C8162]">Employee Rating</p>
                      <p className={`text-lg font-bold ${getRatingColor(entry.selfRating)}`}>
                        {entry.selfRating ?? '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#9C8162] w-24">Your Rating:</span>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleMeritRatingClick(entry.id, rating)}
                        className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 text-lg font-bold transition-all ${
                          managerMeritRatings[entry.id] === rating
                            ? 'border-[#6F4E37] bg-[#6F4E37] text-white scale-110'
                            : 'border-[#E8DCC4] bg-white text-[#9C8162] hover:border-[#6F4E37] hover:bg-[#F4ECE2]'
                        }`}
                      >
                        {rating}
                      </button>
                    ))}
                    {managerMeritRatings[entry.id] && (
                      <span className="ml-4 text-sm font-medium text-[#6F4E37]">
                        {getRatingLabel(managerMeritRatings[entry.id])}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Demerits */}
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#36454F]">Demerit Evaluation</h2>
            <p className="mb-6 text-sm text-[#6F4E37]">Evaluate areas that need improvement</p>

            <div className="space-y-6">
              {demerits.map((entry) => (
                <div key={entry.id} className="border-b border-[#F4ECE2] pb-6 last:border-0 last:pb-0">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#36454F]">{entry.name}</h3>
                      <p className="text-xs text-[#6F4E37]">{entry.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#9C8162]">Employee Rating</p>
                      <p className={`text-lg font-bold ${getRatingColor(entry.selfRating)}`}>
                        {entry.selfRating ?? '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#9C8162] w-24">Your Rating:</span>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleDemeritRatingClick(entry.id, rating)}
                        className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 text-lg font-bold transition-all ${
                          managerDemeritRatings[entry.id] === rating
                            ? 'border-[#6F4E37] bg-[#6F4E37] text-white scale-110'
                            : 'border-[#E8DCC4] bg-white text-[#9C8162] hover:border-[#6F4E37] hover:bg-[#F4ECE2]'
                        }`}
                      >
                        {rating}
                      </button>
                    ))}
                    {managerDemeritRatings[entry.id] && (
                      <span className="ml-4 text-sm font-medium text-[#6F4E37]">
                        {getRatingLabel(managerDemeritRatings[entry.id])}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Overall Rating */}
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#36454F]">Overall Performance Rating</h2>
            
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleOverallRating(rating)}
                  className={`flex h-16 w-16 items-center justify-center rounded-xl border-2 text-2xl font-bold transition-all ${
                    overallRating === rating
                      ? 'border-[#6F4E37] bg-[#6F4E37] text-white scale-110 shadow-lg'
                      : 'border-[#E8DCC4] bg-white text-[#9C8162] hover:border-[#6F4E37] hover:bg-[#F4ECE2]'
                  }`}
                >
                  {rating}
                </button>
              ))}
              {overallRating > 0 && (
                <div className="ml-6">
                  <p className="text-2xl font-bold text-[#36454F]">{getRatingLabel(overallRating)}</p>
                  <p className="text-sm text-[#6F4E37]">Overall Performance</p>
                </div>
              )}
            </div>
            {errors.overallRating && (
              <p className="mt-2 text-xs text-red-600">{errors.overallRating.message}</p>
            )}
          </div>

          {/* Manager Feedback */}
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#36454F]">Manager Feedback</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#36454F]">
                  Strengths <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('strengths')}
                  rows={3}
                  placeholder="What does this employee do particularly well? List specific strengths..."
                  className="mt-2 w-full rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm focus:border-[#6F4E37] focus:outline-none focus:ring-2 focus:ring-[#6F4E37]/20"
                />
                {errors.strengths && (
                  <p className="mt-1 text-xs text-red-600">{errors.strengths.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#36454F]">
                  Areas for Improvement <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('areasForImprovement')}
                  rows={3}
                  placeholder="Where can this employee grow? Be specific and constructive..."
                  className="mt-2 w-full rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm focus:border-[#6F4E37] focus:outline-none focus:ring-2 focus:ring-[#6F4E37]/20"
                />
                {errors.areasForImprovement && (
                  <p className="mt-1 text-xs text-red-600">{errors.areasForImprovement.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#36454F]">
                  Development Plan <span className="text-red-500">*</span>
                </label>
                <p className="mt-1 text-xs text-[#6F4E37]">
                  Outline specific actions, training, or experiences to support development
                </p>
                <textarea
                  {...register('developmentPlan')}
                  rows={4}
                  placeholder="Specific training programs, projects, mentoring opportunities, timeline..."
                  className="mt-2 w-full rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm focus:border-[#6F4E37] focus:outline-none focus:ring-2 focus:ring-[#6F4E37]/20"
                />
                {errors.developmentPlan && (
                  <p className="mt-1 text-xs text-red-600">{errors.developmentPlan.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#36454F]">
                  Overall Comments <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('managerComments')}
                  rows={4}
                  placeholder="Summary of performance, context, expectations for next period..."
                  className="mt-2 w-full rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm focus:border-[#6F4E37] focus:outline-none focus:ring-2 focus:ring-[#6F4E37]/20"
                />
                {errors.managerComments && (
                  <p className="mt-1 text-xs text-red-600">{errors.managerComments.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Compensation Recommendation */}
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#36454F]">Compensation Recommendation</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#36454F] mb-2">
                  Recommendation <span className="text-red-500">*</span>
                </label>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { value: 'no-change', label: 'No Change', desc: 'Maintain current salary' },
                    { value: 'increase', label: 'Salary Increase', desc: 'Merit-based increment' },
                    { value: 'promotion', label: 'Promotion', desc: 'Role elevation & increase' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                        salaryRecommendation === option.value
                          ? 'border-[#6F4E37] bg-[#F4ECE2]'
                          : 'border-[#E8DCC4] hover:border-[#6F4E37]/50'
                      }`}
                    >
                      <input
                        {...register('salaryRecommendation')}
                        type="radio"
                        value={option.value}
                        className="sr-only"
                      />
                      <div>
                        <p className="font-semibold text-[#36454F]">{option.label}</p>
                        <p className="text-xs text-[#6F4E37] mt-1">{option.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {salaryRecommendation === 'increase' && (
                <div>
                  <label className="block text-sm font-medium text-[#36454F]">
                    Increase Percentage
                  </label>
                  <input
                    {...register('salaryIncreasePercent', { valueAsNumber: true })}
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    placeholder="e.g., 5"
                    className="mt-1 w-full rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm focus:border-[#6F4E37] focus:outline-none focus:ring-2 focus:ring-[#6F4E37]/20"
                  />
                </div>
              )}

              {salaryRecommendation === 'promotion' && (
                <div>
                  <label className="block text-sm font-medium text-[#36454F]">
                    Recommended New Position
                  </label>
                  <input
                    {...register('recommendedPromotion')}
                    type="text"
                    placeholder="e.g., Lead Software Engineer"
                    className="mt-1 w-full rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm focus:border-[#6F4E37] focus:outline-none focus:ring-2 focus:ring-[#6F4E37]/20"
                  />
                </div>
              )}
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
              {isSubmitting ? 'Submitting...' : 'Submit Manager Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
