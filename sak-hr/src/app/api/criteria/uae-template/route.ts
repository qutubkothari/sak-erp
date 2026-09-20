import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const competencyTemplates = [
  { name: 'Communication', description: 'Clarity, listening, and stakeholder communication.' },
  { name: 'Teamwork & Collaboration', description: 'Works effectively with cross-functional teams.' },
  { name: 'Leadership & Ownership', description: 'Takes ownership and drives accountability.' },
  { name: 'Problem Solving', description: 'Analyzes issues and proposes workable solutions.' },
  { name: 'Customer Focus', description: 'Understands customer needs and service quality.' },
  { name: 'Quality & Safety', description: 'Maintains quality standards and safety compliance.' },
  { name: 'Compliance & Ethics', description: 'Adheres to policies, UAE labor and business compliance.' },
  { name: 'Initiative', description: 'Proactively identifies improvements and acts.' },
  { name: 'Time Management', description: 'Plans, prioritizes, and meets deadlines.' },
  { name: 'Adaptability', description: 'Responds positively to change and feedback.' },
];

const kpiTemplates = [
  { name: 'Productivity / Output', description: 'Meets output targets within defined timelines.', unit: 'units' },
  { name: 'Quality / Accuracy', description: 'Accuracy rate and defect reduction.', unit: '%' },
  { name: 'Timeliness', description: 'On-time delivery / task completion.', unit: '%' },
  { name: 'Attendance & Punctuality', description: 'Attendance reliability and punctuality.', unit: '%' },
  { name: 'Cost Control', description: 'Uses resources efficiently; reduces wastage.', unit: 'AED' },
  { name: 'Customer Satisfaction', description: 'Service feedback and client satisfaction.', unit: '%' },
];

const meritTemplates = [
  { name: 'Exceptional Team Contribution', description: 'Actively supports team success beyond role scope.' },
  { name: 'Innovation / Improvement', description: 'Introduced measurable process or quality improvements.' },
  { name: 'Customer Appreciation', description: 'Received positive customer feedback or recognition.' },
  { name: 'Attendance Excellence', description: 'Outstanding attendance and punctuality record.' },
];

const demeritTemplates = [
  { name: 'Policy Non-Compliance', description: 'Breach of company policies or procedures.' },
  { name: 'Quality Lapse', description: 'Repeated errors or quality deviations.' },
  { name: 'Safety Incident', description: 'Safety violation or unsafe behavior.' },
  { name: 'Repeated Lateness', description: 'Frequent late arrivals or missed deadlines.' },
  { name: 'Unprofessional Conduct', description: 'Behavior inconsistent with company values.' },
];

export async function POST() {
  const existingCompetencies = await prisma.competency.findMany({
    where: { name: { in: competencyTemplates.map((c) => c.name) } },
    select: { name: true },
  });
  const existingKpis = await prisma.kPI.findMany({
    where: { name: { in: kpiTemplates.map((k) => k.name) } },
    select: { name: true },
  });
  const existingMerits = await prisma.meritDemerit.findMany({
    where: { name: { in: meritTemplates.map((m) => m.name) }, type: 'MERIT' },
    select: { name: true },
  });
  const existingDemerits = await prisma.meritDemerit.findMany({
    where: { name: { in: demeritTemplates.map((m) => m.name) }, type: 'DEMERIT' },
    select: { name: true },
  });

  const existingCompetencyNames = new Set(existingCompetencies.map((c) => c.name));
  const existingKpiNames = new Set(existingKpis.map((k) => k.name));
  const existingMeritNames = new Set(existingMerits.map((m) => m.name));
  const existingDemeritNames = new Set(existingDemerits.map((m) => m.name));

  const createdCompetencies = await prisma.competency.createMany({
    data: competencyTemplates
      .filter((c) => !existingCompetencyNames.has(c.name))
      .map((c) => ({
        name: c.name,
        description: c.description,
        weight: 1,
      })),
  });

  const createdKpis = await prisma.kPI.createMany({
    data: kpiTemplates
      .filter((k) => !existingKpiNames.has(k.name))
      .map((k) => ({
        name: k.name,
        description: k.description,
        unit: k.unit,
        weight: 1,
      })),
  });

  const createdMerits = await prisma.meritDemerit.createMany({
    data: meritTemplates
      .filter((m) => !existingMeritNames.has(m.name))
      .map((m) => ({
        name: m.name,
        description: m.description,
        weight: 1,
        type: 'MERIT' as const,
      })),
  });

  const createdDemerits = await prisma.meritDemerit.createMany({
    data: demeritTemplates
      .filter((m) => !existingDemeritNames.has(m.name))
      .map((m) => ({
        name: m.name,
        description: m.description,
        weight: 1,
        type: 'DEMERIT' as const,
      })),
  });

  return NextResponse.json({
    competenciesAdded: createdCompetencies.count,
    kpisAdded: createdKpis.count,
    meritsAdded: createdMerits.count,
    demeritsAdded: createdDemerits.count,
  });
}
