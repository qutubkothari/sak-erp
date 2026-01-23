import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
  const prismaAny = prisma as any;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const employeeId = session.user.employeeId;

  if (!employeeId) {
    return NextResponse.json({ message: 'Employee profile not linked' }, { status: 404 });
  }

  const employee = await prismaAny.employee.findUnique({
    where: { id: employeeId },
    include: {
      department: true,
      role: true,
      manager: true,
    },
  });

  if (!employee) {
    return NextResponse.json({ message: 'Employee not found' }, { status: 404 });
  }

  const evaluations = (await prismaAny.evaluation.findMany({
    where: { employeeId },
    orderBy: { updatedAt: 'desc' },
    include: {
      cycle: true,
      approvals: true,
      items: true,
    },
  })) as Array<any>;

  const openEvaluations = evaluations.filter((evaluation) => evaluation.status !== 'FINALIZED');
  const pendingActions = evaluations.reduce((count, evaluation) => {
    return (
      count +
      evaluation.approvals.filter((approval: { stage: string; status: string }) => approval.stage === 'EMPLOYEE' && approval.status === 'PENDING').length
    );
  }, 0);

  const currentEvaluation = openEvaluations[0] ?? evaluations[0] ?? null;

  const currentItems = (currentEvaluation?.items ?? []) as Array<any>;
  const kpiIdSet = new Set(currentItems.map((item) => item.kpiId).filter(Boolean) as string[]);
  const meritIdSet = new Set(currentItems.map((item) => item.meritDemeritId).filter(Boolean) as string[]);

  const [kpiList, meritList] = await Promise.all([
    kpiIdSet.size
      ? prismaAny.kPI.findMany({ where: { id: { in: Array.from(kpiIdSet) as string[] } } })
      : Promise.resolve([]),
    meritIdSet.size
      ? prismaAny.meritDemerit.findMany({ where: { id: { in: Array.from(meritIdSet) as string[] } } })
      : Promise.resolve([]),
  ]);

  const kpiById = new Map((kpiList as Array<any>).map((kpi) => [kpi.id, kpi]));
  const meritById = new Map((meritList as Array<any>).map((entry) => [entry.id, entry]));

  const kpis = currentEvaluation
    ? currentItems
        .filter((item) => String(item.type) === 'KPI')
        .map((item) => {
          const kpi = item.kpiId ? kpiById.get(item.kpiId) : undefined;
          return {
            id: item.id,
            name: kpi?.name ?? 'KPI',
            description: kpi?.description ?? null,
            target: kpi?.target ?? null,
            frequency: kpi?.frequency ?? null,
            dataSource: kpi?.dataSource ?? null,
            selfScore: item.selfScore ?? null,
            managerScore: item.managerScore ?? null,
          };
        })
    : [];

  const merits = currentEvaluation
    ? currentItems
        .filter((item) => String(item.type) === 'MERIT')
        .map((item) => {
          const merit = item.meritDemeritId ? meritById.get(item.meritDemeritId) : undefined;
          return {
            id: item.id,
            name: merit?.name ?? 'Merit',
            description: merit?.description ?? null,
            selfScore: item.selfScore ?? null,
            managerScore: item.managerScore ?? null,
          };
        })
    : [];

  const demerits = currentEvaluation
    ? currentItems
        .filter((item) => String(item.type) === 'DEMERIT')
        .map((item) => {
          const demerit = item.meritDemeritId ? meritById.get(item.meritDemeritId) : undefined;
          return {
            id: item.id,
            name: demerit?.name ?? 'Demerit',
            description: demerit?.description ?? null,
            selfScore: item.selfScore ?? null,
            managerScore: item.managerScore ?? null,
          };
        })
    : [];

  return NextResponse.json({
    employee: {
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      department: employee.department?.name ?? null,
      jobRole: employee.role?.title ?? null,
      managerName: employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}`.trim() : null,
    },
    totals: {
      evaluations: evaluations.length,
      openEvaluations: openEvaluations.length,
      pendingActions,
    },
    currentEvaluation: currentEvaluation
      ? {
          id: currentEvaluation.id,
          cycle: currentEvaluation.cycle?.name ?? null,
          status: currentEvaluation.status,
          selfScore: currentEvaluation.selfScore ?? null,
          managerScore: currentEvaluation.managerScore ?? null,
          finalRating: currentEvaluation.finalRating ?? null,
          selfDeadline: (currentEvaluation.cycle as { selfAssessmentDeadline?: Date | null } | null)?.selfAssessmentDeadline ?? null,
        }
      : null,
    openReviews: openEvaluations.map((evaluation) => ({
      id: evaluation.id,
      cycle: evaluation.cycle?.name ?? null,
      status: evaluation.status,
      selfDeadline: (evaluation.cycle as { selfAssessmentDeadline?: Date | null } | null)?.selfAssessmentDeadline ?? null,
    })),
    kpis,
    merits,
    demerits,
  });
}
