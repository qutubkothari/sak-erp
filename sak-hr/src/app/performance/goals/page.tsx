'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const goalSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  category: z.enum(['individual', 'team', 'organizational']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  targetDate: z.string().min(1, 'Target date is required'),
  measurableMetric: z.string().min(5, 'Please specify how success will be measured'),
  alignedCompetency: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface Goal extends GoalFormData {
  id: string;
  employeeId: number;
  status: 'draft' | 'active' | 'completed' | 'archived';
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
  });

  const onSubmit = async (data: GoalFormData) => {
    try {
      // TODO: Replace with actual API call
      const newGoal: Goal = {
        ...data,
        id: `goal-${Date.now()}`,
        employeeId: 1, // Replace with actual employee ID from auth
        status: 'draft',
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setGoals([newGoal, ...goals]);
      toast.success('Goal created successfully');
      reset();
      setShowForm(false);
    } catch (error) {
      toast.error('Failed to create goal');
      console.error(error);
    }
  };

  const filteredGoals = goals.filter((goal) => {
    if (filter === 'all') return true;
    if (filter === 'active') return goal.status === 'active';
    if (filter === 'completed') return goal.status === 'completed';
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'archived':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4EF] p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#36454F]">Goals & Objectives</h1>
            <p className="mt-1 text-sm text-[#6F4E37]">
              Set SMART goals aligned with performance competencies
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C] transition-colors"
          >
            {showForm ? 'Cancel' : '+ New Goal'}
          </button>
        </div>

        {/* Goal Creation Form */}
        {showForm && (
          <div className="mb-6 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#36454F]">Create New Goal</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#36454F]">
                    Goal Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('title')}
                    type="text"
                    placeholder="e.g., Improve customer satisfaction scores by 15%"
                    className="mt-1 w-full rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm focus:border-[#6F4E37] focus:outline-none focus:ring-2 focus:ring-[#6F4E37]/20"
                  />
                  {errors.title && (
                    <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#36454F]">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    placeholder="Detailed description of the goal, including context and expected outcomes..."
                    className="mt-1 w-full rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm focus:border-[#6F4E37] focus:outline-none focus:ring-2 focus:ring-[#6F4E37]/20"
                  />
                  {errors.description && (
                    <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#36454F]">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('category')}
                    className="mt-1 w-full rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm focus:border-[#6F4E37] focus:outline-none focus:ring-2 focus:ring-[#6F4E37]/20"
                  >
                    <option value="individual">Individual Goal</option>
                    <option value="team">Team Goal</option>
                    <option value="organizational">Organizational Goal</option>
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#36454F]">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('priority')}
                    className="mt-1 w-full rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm focus:border-[#6F4E37] focus:outline-none focus:ring-2 focus:ring-[#6F4E37]/20"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  {errors.priority && (
                    <p className="mt-1 text-xs text-red-600">{errors.priority.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#36454F]">
                    Target Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('targetDate')}
                    type="date"
                    className="mt-1 w-full rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm focus:border-[#6F4E37] focus:outline-none focus:ring-2 focus:ring-[#6F4E37]/20"
                  />
                  {errors.targetDate && (
                    <p className="mt-1 text-xs text-red-600">{errors.targetDate.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#36454F]">
                    Measurable Metric <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('measurableMetric')}
                    type="text"
                    placeholder="e.g., Achieve 90% CSAT score"
                    className="mt-1 w-full rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm focus:border-[#6F4E37] focus:outline-none focus:ring-2 focus:ring-[#6F4E37]/20"
                  />
                  {errors.measurableMetric && (
                    <p className="mt-1 text-xs text-red-600">{errors.measurableMetric.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#36454F]">
                    Aligned Competency (Optional)
                  </label>
                  <select
                    {...register('alignedCompetency')}
                    className="mt-1 w-full rounded-lg border border-[#E8DCC4] px-3 py-2 text-sm focus:border-[#6F4E37] focus:outline-none focus:ring-2 focus:ring-[#6F4E37]/20"
                  >
                    <option value="">Select a competency...</option>
                    <option value="leadership">Leadership</option>
                    <option value="communication">Communication</option>
                    <option value="technical">Technical Skills</option>
                    <option value="teamwork">Teamwork</option>
                    <option value="innovation">Innovation</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-[#E8DCC4] px-4 py-2 text-sm font-medium text-[#6F4E37] hover:bg-[#F4ECE2] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C] disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Creating...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-4 flex gap-2">
          {(['all', 'active', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === tab
                  ? 'bg-[#6F4E37] text-white'
                  : 'bg-white text-[#6F4E37] border border-[#E8DCC4] hover:bg-[#F4ECE2]'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Goals List */}
        {filteredGoals.length === 0 ? (
          <div className="rounded-2xl border border-[#E8DCC4] bg-white p-12 text-center shadow-sm">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#F4ECE2] flex items-center justify-center mb-4">
              <span className="text-3xl">🎯</span>
            </div>
            <h3 className="text-lg font-semibold text-[#36454F] mb-2">No goals yet</h3>
            <p className="text-sm text-[#6F4E37] mb-4">
              Create your first SMART goal to start tracking your professional development
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C] transition-colors"
            >
              Create Goal
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGoals.map((goal) => (
              <div
                key={goal.id}
                className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-[#36454F]">{goal.title}</h3>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(
                          goal.status
                        )}`}
                      >
                        {goal.status}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${getPriorityColor(
                          goal.priority
                        )}`}
                      >
                        {goal.priority}
                      </span>
                    </div>
                    <p className="text-sm text-[#6F4E37] mb-4">{goal.description}</p>

                    <div className="grid gap-3 md:grid-cols-3 text-xs">
                      <div>
                        <span className="text-[#9C8162]">Category:</span>
                        <span className="ml-2 font-medium text-[#36454F]">
                          {goal.category.charAt(0).toUpperCase() + goal.category.slice(1)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#9C8162]">Target Date:</span>
                        <span className="ml-2 font-medium text-[#36454F]">
                          {new Date(goal.targetDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#9C8162]">Metric:</span>
                        <span className="ml-2 font-medium text-[#36454F]">
                          {goal.measurableMetric}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#9C8162]">Progress</span>
                        <span className="text-xs font-semibold text-[#36454F]">
                          {goal.progress}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#F4ECE2]">
                        <div
                          className="h-2 rounded-full bg-[#6F4E37] transition-all duration-300"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
