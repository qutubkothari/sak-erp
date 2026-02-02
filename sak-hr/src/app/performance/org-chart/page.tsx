'use client';

import { useEffect, useState } from 'react';
import { Users, Building2, User, ChevronRight, ChevronDown } from 'lucide-react';

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  code: string;
  managerId: string | null;
  department: {
    id: string;
    name: string;
  } | null;
  role: {
    id: string;
    title: string;
  } | null;
  reports?: Employee[];
};

type TreeNode = Employee & {
  reports: TreeNode[];
};

export default function OrganizationHierarchyPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [hierarchy, setHierarchy] = useState<TreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await fetch('/api/employees');
      const data = await response.json();
      setEmployees(Array.isArray(data) ? data : []);
      
      // Build hierarchy
      const tree = buildHierarchy(Array.isArray(data) ? data : []);
      setHierarchy(tree);
      
      // Expand top level by default
      const topLevel = new Set(tree.map(e => e.id));
      setExpandedNodes(topLevel);
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildHierarchy = (employees: Employee[]): TreeNode[] => {
    const employeeMap = new Map<string, TreeNode>();
    
    // Create map of all employees
    employees.forEach(emp => {
      employeeMap.set(emp.id, { ...emp, reports: [] });
    });
    
    // Build parent-child relationships
    const roots: TreeNode[] = [];
    employeeMap.forEach(emp => {
      if (emp.managerId && employeeMap.has(emp.managerId)) {
        employeeMap.get(emp.managerId)!.reports.push(emp);
      } else {
        roots.push(emp);
      }
    });
    
    // Sort by name
    const sortByName = (a: TreeNode, b: TreeNode) => 
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    
    const sortRecursive = (nodes: TreeNode[]) => {
      nodes.sort(sortByName);
      nodes.forEach(node => {
        if (node.reports.length > 0) {
          sortRecursive(node.reports);
        }
      });
    };
    
    sortRecursive(roots);
    return roots;
  };

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set(employees.map(e => e.id));
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    const hasReports = node.reports.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const indent = level * 32;

    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-3 py-3 px-4 hover:bg-[#F4ECE2] rounded-lg cursor-pointer transition-colors"
          style={{ paddingLeft: `${indent + 16}px` }}
          onClick={() => hasReports && toggleNode(node.id)}
        >
          {/* Expand/Collapse Icon */}
          <div className="w-5 h-5 flex items-center justify-center">
            {hasReports ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-[#6F4E37]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#6F4E37]" />
              )
            ) : (
              <div className="w-1 h-1 rounded-full bg-[#9C8162]" />
            )}
          </div>

          {/* Employee Info */}
          <div className="flex-1 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#6F4E37] text-white flex items-center justify-center text-sm font-semibold">
              {node.firstName.charAt(0)}{node.lastName.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#36454F]">
                {node.firstName} {node.lastName}
              </p>
              <p className="text-xs text-[#6F4E37]">
                {node.role?.title || 'No Role'} • {node.department?.name || 'No Department'}
              </p>
            </div>
            {hasReports && (
              <span className="px-2 py-1 bg-[#E8DCC4] rounded text-xs font-medium text-[#6F4E37]">
                {node.reports.length} {node.reports.length === 1 ? 'report' : 'reports'}
              </span>
            )}
          </div>
        </div>

        {/* Render children */}
        {hasReports && isExpanded && (
          <div>
            {node.reports.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderListView = () => {
    const grouped = employees.reduce((acc, emp) => {
      const dept = emp.department?.name || 'No Department';
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(emp);
      return acc;
    }, {} as Record<string, Employee[]>);

    return (
      <div className="space-y-6">
        {Object.entries(grouped).map(([dept, emps]) => (
          <div key={dept} className="rounded-2xl border border-[#E8DCC4] bg-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="h-5 w-5 text-[#6F4E37]" />
              <h3 className="font-semibold text-[#36454F]">{dept}</h3>
              <span className="text-sm text-[#9C8162]">({emps.length})</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {emps.map(emp => (
                <div key={emp.id} className="flex items-center gap-3 p-3 border border-[#E8DCC4] rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-[#6F4E37] text-white flex items-center justify-center text-sm font-semibold">
                    {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#36454F] truncate">
                      {emp.firstName} {emp.lastName}
                    </p>
                    <p className="text-xs text-[#6F4E37] truncate">{emp.role?.title || 'No Role'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const totalManagers = employees.filter(e => 
    employees.some(emp => emp.managerId === e.id)
  ).length;

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#36454F]">Organization Hierarchy</h1>
          <p className="mt-2 text-sm text-[#6F4E37]">
            Visual representation of reporting relationships and organizational structure
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-[#9C8162]">Loading organization structure...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4 mb-8">
              <div className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[#6F4E37]/10 p-3">
                    <Users className="h-5 w-5 text-[#6F4E37]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">Total Employees</p>
                    <p className="text-2xl font-semibold text-[#36454F]">{employees.length}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-3">
                    <User className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">Managers</p>
                    <p className="text-2xl font-semibold text-[#36454F]">{totalManagers}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-100 p-3">
                    <Building2 className="h-5 w-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">Departments</p>
                    <p className="text-2xl font-semibold text-[#36454F]">
                      {new Set(employees.map(e => e.department?.id).filter(Boolean)).size}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8DCC4] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-100 p-3">
                    <Users className="h-5 w-5 text-purple-700" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#9C8162]">Top Level</p>
                    <p className="text-2xl font-semibold text-[#36454F]">{hierarchy.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('tree')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'tree'
                      ? 'bg-[#6F4E37] text-white'
                      : 'bg-white border border-[#E8DCC4] text-[#6F4E37] hover:bg-[#F4ECE2]'
                  }`}
                >
                  Tree View
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-[#6F4E37] text-white'
                      : 'bg-white border border-[#E8DCC4] text-[#6F4E37] hover:bg-[#F4ECE2]'
                  }`}
                >
                  Department View
                </button>
              </div>

              {viewMode === 'tree' && (
                <div className="flex gap-2">
                  <button
                    onClick={expandAll}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-[#E8DCC4] text-[#6F4E37] hover:bg-[#F4ECE2]"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={collapseAll}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-[#E8DCC4] text-[#6F4E37] hover:bg-[#F4ECE2]"
                  >
                    Collapse All
                  </button>
                </div>
              )}
            </div>

            {/* Hierarchy View */}
            <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
              {viewMode === 'tree' ? (
                hierarchy.length === 0 ? (
                  <p className="text-center py-8 text-[#9C8162]">No employees found</p>
                ) : (
                  <div className="space-y-1">
                    {hierarchy.map(node => renderTreeNode(node))}
                  </div>
                )
              ) : (
                renderListView()
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
