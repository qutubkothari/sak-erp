import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type RatingScaleUpdate = {
  name?: string;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as RatingScaleUpdate;

  if (!body.name?.trim()) {
    return NextResponse.json({ message: 'Name is required' }, { status: 400 });
  }

  const scale = await prisma.ratingScale.update({
    where: { id },
    data: { name: body.name.trim() },
  });

  return NextResponse.json(scale);
}
