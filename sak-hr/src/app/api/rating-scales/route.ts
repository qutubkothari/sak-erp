import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RatingScaleInput = {
  name: string;
};

export async function GET() {
  const scales = await prisma.ratingScale.findMany({
    orderBy: { createdAt: 'desc' },
    include: { levels: true },
  });

  return NextResponse.json(scales);
}

export async function POST(request: Request) {
  const body = (await request.json()) as RatingScaleInput;

  if (!body.name) {
    return NextResponse.json({ message: 'Name is required' }, { status: 400 });
  }

  const scale = await prisma.ratingScale.create({
    data: { name: body.name },
  });

  return NextResponse.json(scale, { status: 201 });
}
