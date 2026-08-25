'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, RefreshCw, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../../lib/api-client';
import SearchableSelect from '../../../components/SearchableSelect';
import { ErpButton, ErpMetricStrip, ErpPageHeader, ErpStatusBadge } from '../../../components/ui/ErpPrimitives';
import { SlidePanel } from '../../../components/ui/SlidePanel';

type Project = {
  id: string;
  project_code: string;
  project_name: string;
  department: string;
  status: string;
  description?: string | null;
  created_at?: string;
};

type ProjectEvent = {
  id: string;
  event_type: string;
  source_module?: string | null;
  source_number?: string | null;
  remarks?: string | null;
  created_at: string;
};

const DEPARTMENT_OPTIONS = [
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'R&D', label: 'R&D' },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    projectName: '',
    projectCode: '',
    department: 'PRODUCTION',
    description: '',
  });

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/projects?status=ACTIVE');
      setProjects(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    const tokens = search.toLowerCase().split(/\s+/).filter(Boolean);
    return projects.filter((project) => {
      if (departmentFilter && project.department !== departmentFilter) return false;
      const haystack = `${project.project_code} ${project.project_name} ${project.description || ''}`.toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }, [projects, search, departmentFilter]);

  const openTrail = async (project: Project) => {
    setSelectedProject(project);
    setEvents([]);
    try {
      const data = await apiClient.get(`/projects/${project.id}/trail`);
      setEvents(Array.isArray(data?.events) ? data.events : []);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load project trail');
    }
  };

  const createProject = async () => {
    if (!form.projectName.trim()) {
      toast.error('Project name is required');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/projects', form);
      toast.success('Project created');
      setShowCreate(false);
      setForm({ projectName: '', projectCode: '', department: 'PRODUCTION', description: '' });
      loadProjects();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      <ErpPageHeader
        eyebrow="Project Control"
        title="Projects"
        description="Maintain production and R&D project masters, then track procurement and inventory trail against each project."
        actions={(
          <div className="flex gap-2">
            <ErpButton variant="secondary" onClick={loadProjects}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </ErpButton>
            <ErpButton variant="primary" onClick={() => setShowCreate(true)}>
              <ClipboardList className="h-4 w-4" />
              New Project
            </ErpButton>
          </div>
        )}
      />

      <ErpMetricStrip
        loading={loading}
        metrics={[
          { label: 'Active Projects', value: projects.length },
          { label: 'Production', value: projects.filter((p) => p.department === 'PRODUCTION').length },
          { label: 'R&D', value: projects.filter((p) => p.department === 'R&D').length },
          { label: 'Filtered', value: filteredProjects.length },
        ]}
      />

      <section className="border border-[#D8C8AA] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#E6D8BF] p-3 lg:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A6555]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 w-full border border-[#D8C8AA] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#8B6F47]"
              placeholder="Search project code, name, or description"
            />
          </label>
          <div className="w-full lg:w-72">
            <SearchableSelect
              value={departmentFilter}
              onChange={setDepartmentFilter}
              options={[{ value: '', label: 'All departments' }, ...DEPARTMENT_OPTIONS]}
              placeholder="All departments"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-[#F7F3EA] text-left text-xs uppercase text-[#5E4635]">
              <tr>
                <th className="px-4 py-3">Project Code</th>
                <th className="px-4 py-3">Project Name</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id} className="border-t border-[#E6D8BF]">
                  <td className="px-4 py-3 font-semibold text-[#4A3426]">{project.project_code}</td>
                  <td className="px-4 py-3">{project.project_name}</td>
                  <td className="px-4 py-3">{project.department}</td>
                  <td className="px-4 py-3"><ErpStatusBadge status={project.status} /></td>
                  <td className="max-w-[360px] px-4 py-3 text-[#6B5A48]">{project.description || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <ErpButton variant="secondary" onClick={() => openTrail(project)}>Trail</ErpButton>
                  </td>
                </tr>
              ))}
              {!loading && filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#7A6555]">No projects found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <SlidePanel
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Project"
        subtitle="Project master"
        width="full"
        footer={(
          <>
            <ErpButton variant="ghost" onClick={() => setShowCreate(false)}>Cancel</ErpButton>
            <ErpButton variant="primary" onClick={createProject} disabled={saving}>
              {saving ? 'Saving...' : 'Create Project'}
            </ErpButton>
          </>
        )}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#5E4635]">Project Name *</span>
            <input
              value={form.projectName}
              onChange={(event) => setForm((prev) => ({ ...prev, projectName: event.target.value }))}
              className="h-10 w-full border border-[#D8C8AA] px-3 outline-none focus:border-[#8B6F47]"
              placeholder="e.g. Coupler R&D Trial"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#5E4635]">Project Code</span>
            <input
              value={form.projectCode}
              onChange={(event) => setForm((prev) => ({ ...prev, projectCode: event.target.value }))}
              className="h-10 w-full border border-[#D8C8AA] px-3 outline-none focus:border-[#8B6F47]"
              placeholder="Auto generated if blank"
            />
          </label>
          <div className="space-y-2">
            <span className="text-sm font-medium text-[#5E4635]">Department *</span>
            <SearchableSelect
              value={form.department}
              onChange={(department) => setForm((prev) => ({ ...prev, department }))}
              options={DEPARTMENT_OPTIONS}
              placeholder="Select department"
            />
          </div>
          <label className="space-y-2 lg:col-span-2">
            <span className="text-sm font-medium text-[#5E4635]">Description</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
              className="w-full border border-[#D8C8AA] px-3 py-2 outline-none focus:border-[#8B6F47]"
              placeholder="Scope, customer, trial purpose, or notes"
            />
          </label>
        </div>
      </SlidePanel>

      <SlidePanel
        open={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        title={selectedProject?.project_name || 'Project Trail'}
        subtitle={selectedProject?.project_code}
        width="full"
        footer={<ErpButton variant="ghost" onClick={() => setSelectedProject(null)}><X className="h-4 w-4" />Close</ErpButton>}
      >
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="border-l-4 border-[#8B6F47] bg-[#FAF7EF] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-[#4A3426]">{event.event_type}</p>
                <p className="text-xs text-[#7A6555]">{event.created_at ? new Date(event.created_at).toLocaleString() : ''}</p>
              </div>
              <p className="mt-1 text-sm text-[#5E4635]">{event.source_module || '-'} {event.source_number ? `- ${event.source_number}` : ''}</p>
              {event.remarks && <p className="mt-2 text-sm text-[#6B5A48]">{event.remarks}</p>}
            </div>
          ))}
          {events.length === 0 && <p className="text-sm text-[#7A6555]">No trail events yet.</p>}
        </div>
      </SlidePanel>
    </div>
  );
}
