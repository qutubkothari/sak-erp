export interface SalaryComponentRow {
  id: string;
  employee_id: string;
  employee_name?: string;
  component_type: string;
  component_name: string;
  amount: number;
  is_taxable: boolean;
  ctc_revised_date?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  effective_date_state?: string | null;
  effective_date?: string | null;
  revised_date?: string | null;
}

export interface SalaryComponentEmployeeGroup {
  employeeId: string;
  employeeName: string;
  components: SalaryComponentRow[];
  componentCount: number;
  ctc: SalaryComponentRow | null;
  lastRevisedDate: string | null;
}

const componentOrder: Record<string, number> = {
  CTC: 0,
  BASIC: 1,
  HRA: 2,
  ALLOWANCE: 3,
  BONUS: 4,
  DEDUCTION: 5,
  PF: 6,
  ESI: 7,
  TAX: 8,
};

const revisedDate = (component: SalaryComponentRow) =>
  component.effective_from || component.ctc_revised_date || component.revised_date || component.effective_date || null;

const dateValue = (date: string | null) => {
  if (!date) return Number.NEGATIVE_INFINITY;
  const value = Date.parse(`${date.slice(0, 10)}T00:00:00`);
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
};

export function groupSalaryComponents(
  rows: SalaryComponentRow[],
  today = new Date(),
): SalaryComponentEmployeeGroup[] {
  const groups = new Map<string, SalaryComponentRow[]>();
  for (const row of rows) {
    // Keep malformed rows distinct rather than accidentally merging unrelated employees.
    const employeeId = row.employee_id || `__missing_employee__:${row.id}`;
    const group = groups.get(employeeId) || [];
    group.push(row);
    groups.set(employeeId, group);
  }

  const todayValue = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Array.from(groups.entries())
    .map(([employeeId, components]) => {
      const sorted = [...components].sort((a, b) => {
        const aType = String(a.component_type || "").toUpperCase();
        const bType = String(b.component_type || "").toUpperCase();
        const order = (componentOrder[aType] ?? 100) - (componentOrder[bType] ?? 100);
        return order || a.component_name.localeCompare(b.component_name);
      });
      const ctc = components
        .filter((component) => String(component.component_type).toUpperCase() === "CTC")
        .filter((component) => dateValue(revisedDate(component)) <= todayValue)
        .filter((component) => !component.effective_to || dateValue(component.effective_to) >= todayValue)
        .sort((a, b) => dateValue(revisedDate(b)) - dateValue(revisedDate(a)))[0] || null;
      const dates = components
        .map(revisedDate)
        .filter((date): date is string => Boolean(date) && dateValue(date) <= todayValue);
      const lastRevisedDate = dates.sort((a, b) => dateValue(b) - dateValue(a))[0] || null;
      return {
        employeeId,
        employeeName: components.find((component) => component.employee_name)?.employee_name || "N/A",
        components: sorted,
        componentCount: sorted.length,
        ctc,
        lastRevisedDate,
      };
    })
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName) || a.employeeId.localeCompare(b.employeeId));
}

export function filterSalaryComponentGroups(
  groups: SalaryComponentEmployeeGroup[],
  query: string,
): SalaryComponentEmployeeGroup[] {
  const term = query.trim().toLocaleLowerCase();
  if (!term) return groups;
  return groups
    .map((group) => {
      if (group.employeeName.toLocaleLowerCase().includes(term)) return group;
      const matching = group.components.filter((component) =>
        `${component.component_type} ${component.component_name}`.toLocaleLowerCase().includes(term),
      );
      return matching.length ? { ...group, components: matching } : null;
    })
    .filter((group): group is SalaryComponentEmployeeGroup => Boolean(group));
}

export function salaryComponentIsCurrent(component: SalaryComponentRow, today = new Date()): boolean {
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const start = revisedDate(component);
  const end = component.effective_to || null;
  return (!start || dateValue(start) <= currentDay) && (!end || dateValue(end) >= currentDay);
}
