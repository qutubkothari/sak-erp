'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

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
  employeeId: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  progress: number;
  createdAt: string;
  updatedAt: string;
}

interface CompetencyOption {
  id: string;
  name: string;
}

export default function GoalsPage() {
  const { data: session } = useSession();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [competencies, setCompetencies] = useState<CompetencyOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [progressDrafts, setProgressDrafts] = useState<Record<string, number>>({});

  console.log('GoalsPage render - session:', session);
  console.log('GoalsPage render - competencies:', competencies);

  const initialGoalValues: GoalFormData = {
    title: '',
    description: '',
    category: 'individual',
    priority: 'medium',
    targetDate: '',
    measurableMetric: '',
    alignedCompetency: '',
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: initialGoalValues,
  });

  useEffect(() => {
    if (showForm && !editingGoalId) {
      reset(initialGoalValues);
    }
  }, [showForm, editingGoalId, reset]);

  useEffect(() => {
    console.log('useEffect triggered - session?.user:', session?.user);
    console.log('useEffect triggered - employeeId:', session?.user?.employeeId);
    
    const load = async () => {
      try {
        const employeeId = session?.user?.employeeId;
        console.log('Inside load function - employeeId:', employeeId);
        
        // Always fetch competencies (they're global data)
        console.log('Fetching competencies...');
        const compsRes = await fetch('/api/competencies');
        console.log('Competencies response status:', compsRes.status);
        console.log('Competencies response headers:', Object.fromEntries(compsRes.headers.entries()));
        const compsText = await compsRes.text();
        console.log('Competencies raw response:', compsText);
        let compsData: unknown = [];
        try {
          compsData = compsText ? JSON.parse(compsText) : [];
        } catch (parseError) {
          console.error('Failed to parse competencies JSON:', parseError);
        }
        console.log('Competencies API response:', compsData);
        console.log('Is array?', Array.isArray(compsData));
        setCompetencies(Array.isArray(compsData) ? compsData : []);
        console.log('Competencies state set to:', Array.isArray(compsData) ? compsData : []);

        // Only fetch goals if we have an employeeId
        if (!employeeId) {
          console.log('No employeeId, skipping goals fetch');
          return;
        }

        console.log('Fetching goals...');
        const goalsRes = await fetch(`/api/goals?employeeId=${employeeId}`);
        console.log('Goals response status:', goalsRes.status);
        console.log('Goals response headers:', Object.fromEntries(goalsRes.headers.entries()));
        const goalsText = await goalsRes.text();
        console.log('Goals raw response:', goalsText);
        let goalsData: unknown = [];
        try {
          goalsData = goalsText ? JSON.parse(goalsText) : [];
        } catch (parseError) {
          console.error('Failed to parse goals JSON:', parseError);
        }
        setGoals(Array.isArray(goalsData) ? goalsData : []);
      } catch (error) {
        console.error('Error in load function:', error);
        toast.error('Failed to load goals');
      }
    };

    if (session?.user) {
      console.log('session.user exists, calling load()');
      load();
    } else {
      console.log('No session.user, not calling load()');
    }
  }, [session?.user]);

  const onSubmit = async (data: GoalFormData) => {
    try {
      const employeeId = session?.user?.employeeId;
      if (!employeeId) {
        toast.error('Employee profile not linked to user.');
        return;
      }
      if (editingGoalId) {
        const response = await fetch(`/api/goals/${editingGoalId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const updated = await response.json();
        if (!response.ok) {
          toast.error(updated?.message || 'Failed to update goal');
          return;
        }

        setGoals(goals.map((goal) => (goal.id === editingGoalId ? updated : goal)));
        toast.success('Goal updated successfully');
      } else {
        const response = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId,
            ...data,
          }),
        });

        const created = await response.json();
        if (!response.ok) {
          toast.error(created?.message || 'Failed to create goal');
          return;
        }

        setGoals([created, ...goals]);
        toast.success('Goal created successfully');
      }

      reset(initialGoalValues);
      setEditingGoalId(null);
      setShowForm(false);
    } catch (error) {
      toast.error(editingGoalId ? 'Failed to update goal' : 'Failed to create goal');
      console.error(error);
    }
  };

  const startEdit = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setShowForm(true);
    reset({
      title: goal.title,
      description: goal.description,
      category: goal.category,
      priority: goal.priority,
      targetDate: new Date(goal.targetDate).toISOString().slice(0, 10),
      measurableMetric: goal.measurableMetric,
      alignedCompetency: goal.alignedCompetency || '',
    });
  };

  const cancelEdit = () => {
    setEditingGoalId(null);
    reset({
      title: '',
      description: '',
      category: 'individual',
      priority: 'medium',
      targetDate: '',
      measurableMetric: '',
      alignedCompetency: '',
    });
    setShowForm(false);
  };

  const deleteGoal = async (goalId: string) => {
    const confirmed = window.confirm('Delete this goal? This cannot be undone.');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/goals/${goalId}`, { method: 'DELETE' });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        toast.error(body?.message || 'Failed to delete goal');
        return;
      }
      setGoals(goals.filter((goal) => goal.id !== goalId));
      toast.success('Goal deleted');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete goal');
    }
  };

  const updateProgress = async (goal: Goal) => {
    const draftValue = progressDrafts[goal.id];
    const nextProgress = Number.isFinite(draftValue) ? draftValue : goal.progress;
    const nextStatus = nextProgress >= 100 ? 'completed' : goal.status === 'completed' ? 'active' : goal.status;

    try {
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: nextProgress, status: nextStatus }),
      });

      const updated = await response.json();
      if (!response.ok) {
        toast.error(updated?.message || 'Failed to update progress');
        return;
      }

      setGoals(goals.map((item) => (item.id === goal.id ? updated : item)));
      setProgressDrafts((prev) => ({ ...prev, [goal.id]: updated.progress }));
      toast.success('Progress updated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update progress');
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
            onClick={() => {
              if (showForm) {
                cancelEdit();
              } else {
                setEditingGoalId(null);
                reset();
                setShowForm(true);
              }
            }}
            className="rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C] transition-colors"
          >
            {showForm ? 'Cancel' : '+ New Goal'}
          </button>
        </div>

        {/* Goal Creation Form */}
        {showForm && (
          <div className="mb-6 rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#36454F]">
              {editingGoalId ? 'Edit Goal' : 'Create New Goal'}
            </h2>
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
                    {competencies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-lg border border-[#E8DCC4] px-4 py-2 text-sm font-medium text-[#6F4E37] hover:bg-[#F4ECE2] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A3E2C] disabled:opacity-50 transition-colors"
                >
                  {isSubmitting
                    ? editingGoalId
                      ? 'Saving...'
                      : 'Creating...'
                    : editingGoalId
                      ? 'Save Changes'
                      : 'Create Goal'}
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
                <div className="flex items-start justify-between gap-4">
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
                      <div className="mt-3 flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={progressDrafts[goal.id] ?? goal.progress}
                          onChange={(e) =>
                            setProgressDrafts((prev) => ({
                              ...prev,
                              [goal.id]: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-[#6F4E37]"
                        />
                        <span className="text-xs font-semibold text-[#6F4E37]">
                          {progressDrafts[goal.id] ?? goal.progress}%
                        </span>
                        <button
                          type="button"
                          onClick={() => updateProgress(goal)}
                          className="rounded-lg border border-[#D9CBB6] px-3 py-1 text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
                        >
                          Update
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(goal)}
                      className="rounded-lg border border-[#E8DCC4] px-3 py-1 text-xs font-medium text-[#6F4E37] hover:bg-[#F4ECE2]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteGoal(goal.id)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
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
