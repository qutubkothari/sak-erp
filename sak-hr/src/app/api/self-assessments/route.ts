import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const evaluationId = searchParams.get('evaluationId');

  if (!evaluationId) {
    return NextResponse.json({ message: 'evaluationId is required' }, { status: 400 });
  }

  const assessment = await prisma.selfAssessment.findUnique({
    where: { evaluationId },
  });

  return NextResponse.json(assessment);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    evaluationId: string;
    accomplishments: string;
    challenges: string;
    developmentNeeds: string;
    comments?: string;
    submit?: boolean;
  };

  if (!body.evaluationId) {
    return NextResponse.json({ message: 'evaluationId is required' }, { status: 400 });
  }

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: body.evaluationId },
    include: {
      cycle: true,
      employee: { select: { id: true, firstName: true, lastName: true, managerId: true } },
    },
  });

  if (!evaluation) {
    return NextResponse.json({ message: 'Evaluation not found' }, { status: 404 });
  }

  const submit = body.submit !== false;

  if (submit && evaluation.cycle?.selfAssessmentDeadline) {
    const deadline = new Date(evaluation.cycle.selfAssessmentDeadline);
    if (Date.now() > deadline.getTime()) {
      return NextResponse.json({ message: 'Self-assessment deadline has passed' }, { status: 403 });
    }
  }

  const assessment = await prisma.selfAssessment.upsert({
    where: { evaluationId: body.evaluationId },
    create: {
      evaluationId: body.evaluationId,
      accomplishments: body.accomplishments,
      challenges: body.challenges,
      developmentNeeds: body.developmentNeeds,
      comments: body.comments || null,
    },
    update: {
      accomplishments: body.accomplishments,
      challenges: body.challenges,
      developmentNeeds: body.developmentNeeds,
      comments: body.comments || null,
    },
  });

  const managerId = evaluation.employee?.managerId;
  const users = await prisma.user.findMany({
    where: { employeeId: { in: [evaluation.employeeId, managerId || ''] } },
    select: { id: true, employeeId: true },
  });
  const userByEmployeeId = new Map(users.map((user) => [user.employeeId, user.id]));
  const employeeUserId = userByEmployeeId.get(evaluation.employeeId);

  if (!submit) {
    await prisma.evaluationActivity.create({
      data: {
        evaluationId: evaluation.id,
        actorId: employeeUserId ?? null,
        action: 'SELF_ASSESSMENT_DRAFT_SAVED',
        details: { evaluationId: evaluation.id, cycleId: evaluation.cycleId },
      },
    });

    return NextResponse.json(assessment, { status: 201 });
  }

  await prisma.evaluationApproval.updateMany({
    where: {
      evaluationId: body.evaluationId,
      stage: 'EMPLOYEE',
    },
    data: {
      status: 'APPROVED',
      approverId: evaluation.employeeId,
      approvedAt: new Date(),
    },
  });

  await prisma.evaluation.update({
    where: { id: body.evaluationId },
    data: { status: 'MANAGER_REVIEW' },
  });

  const notifications = [] as Array<{
    userId: string;
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  }>;

  const managerUserId = managerId ? userByEmployeeId.get(managerId) : undefined;
  if (managerUserId) {
    notifications.push({
      userId: managerUserId,
      type: 'approval_needed',
      title: 'Self-assessment submitted',
      message: `${evaluation.employee?.firstName} ${evaluation.employee?.lastName} submitted their self-assessment.`,
      actionUrl: `/performance/manager-review?evaluationId=${evaluation.id}`,
      metadata: { evaluationId: evaluation.id, cycleId: evaluation.cycleId },
    });
  }

  if (employeeUserId) {
    notifications.push({
      userId: employeeUserId,
      type: 'review_reminder',
      title: 'Self-assessment submitted',
      message: `Your self-assessment for ${evaluation.cycle?.name ?? 'the review cycle'} was submitted.`,
      actionUrl: `/performance/self-assessment?evaluationId=${evaluation.id}`,
      metadata: { evaluationId: evaluation.id, cycleId: evaluation.cycleId },
    });
  }

  await prisma.evaluationActivity.create({
    data: {
      evaluationId: evaluation.id,
      actorId: employeeUserId ?? null,
      action: 'SELF_ASSESSMENT_SUBMITTED',
      details: { evaluationId: evaluation.id, cycleId: evaluation.cycleId },
    },
  });

  if (notifications.length) {
    await prisma.notification.createMany({ data: notifications });
  }

  return NextResponse.json(assessment, { status: 201 });
}
