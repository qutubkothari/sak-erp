'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const managerReviewSchema = z.object({
  competencyRatings: z.record(z.string(), z.number().min(1).max(5)),
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
  id: number;
  name: string;
  position: string;
  department: string;
  joinDate: string;
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
  description: string;
  selfRating: number;
}

export default function ManagerReviewPage() {
  // Mock data - replace with API calls
  const [employee] = useState<Employee>({
    id: 1,
    name: 'Ahmed Al-Mansoori',
    position: 'Senior Software Engineer',
    department: 'Engineering',
    joinDate: '2022-03-15',
  });

  const [selfAssessment] = useState<SelfAssessment>({
    competencyRatings: { c1: 4, c2: 5, c3: 4, c4: 5, c5: 3 },
    accomplishments: 'Led the successful migration of legacy systems to cloud infrastructure, resulting in 40% cost reduction. Mentored 3 junior developers.',
    challenges: 'Initial resistance to change from team members. Overcame through regular workshops and hands-on support sessions.',
    developmentNeeds: 'Would benefit from advanced cloud architecture certification and leadership training.',
  });

  const [competencies] = useState<Competency[]>([
    { id: 'c1', name: 'Communication', description: 'Effectively conveys information', selfRating: 4 },
    { id: 'c2', name: 'Problem Solving', description: 'Identifies and resolves issues', selfRating: 5 },
    { id: 'c3', name: 'Technical Excellence', description: 'Job-specific expertise', selfRating: 4 },
    { id: 'c4', name: 'Teamwork', description: 'Collaborates effectively', selfRating: 5 },
    { id: 'c5', name: 'Leadership', description: 'Guides team members', selfRating: 3 },
  ]);

  const [managerRatings, setManagerRatings] = useState<{ [key: string]: number }>({});
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
      salaryRecommendation: 'no-change',
    },
  });

  const salaryRecommendation = watch('salaryRecommendation');

  const handleRatingClick = (competencyId: string, rating: number) => {
    setManagerRatings({ ...managerRatings, [competencyId]: rating });
    setValue(`competencyRatings.${competencyId}`, rating);
  };

  const handleOverallRating = (rating: number) => {
    setOverallRating(rating);
    setValue('overallRating', rating);
  };

  const onSubmit = async (data: ManagerReviewFormData) => {
    try {
      console.log('Submitting manager review:', data);
      await new Promise((resolve) => setTimeout(resolve, 1000));
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

  const getRatingColor = (rating: number) => {
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
          <p className="mt-1 text-sm text-[#6F4E37]">Performance evaluation for {employee.name}</p>
        </div>

        {/* Employee Info Card */}
        <div className="mb-6 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#36454F]">Employee Information</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <span className="text-xs text-[#9C8162]">Name</span>
              <p className="font-semibold text-[#36454F]">{employee.name}</p>
            </div>
            <div>
              <span className="text-xs text-[#9C8162]">Position</span>
              <p className="font-semibold text-[#36454F]">{employee.position}</p>
            </div>
            <div>
              <span className="text-xs text-[#9C8162]">Department</span>
              <p className="font-semibold text-[#36454F]">{employee.department}</p>
            </div>
          </div>
        </div>

        {/* Self-Assessment Summary */}
        <div className="mb-6 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#36454F]">Employee Self-Assessment</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[#36454F]">Key Accomplishments</h3>
              <p className="text-sm text-[#6F4E37]">{selfAssessment.accomplishments}</p>
            </div>
            
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[#36454F]">Challenges Faced</h3>
              <p className="text-sm text-[#6F4E37]">{selfAssessment.challenges}</p>
            </div>
            
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[#36454F]">Development Needs</h3>
              <p className="text-sm text-[#6F4E37]">{selfAssessment.developmentNeeds}</p>
            </div>
          </div>
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
                        {comp.selfRating}
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
