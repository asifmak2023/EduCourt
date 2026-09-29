"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "./api";
import type {
  AcademicOptions,
  AcademicYear,
  Book,
  Campus,
  CanteenItem,
  CanteenSupplier,
  ChartOfAccount,
  ClassRoom,
  Department,
  Designation,
  Exam,
  ExamPaper,
  ExamType,
  ExpenseCategory,
  FiscalYear,
  GradeScale,
  Hostel,
  HostelRoom,
  Institution,
  InventoryCategory,
  Lab,
  Paginated,
  Period,
  Room,
  RoleOption,
  SalaryComponent,
  Scholarship,
  Section,
  Sport,
  SportTeam,
  Stage,
  StudentClub,
  StudentEvent,
  StaffMember,
  Student,
  Subject,
  SyllabusUnit,
  Term,
  TransportRoute,
  TransportRouteStop,
  User,
  Vendor,
  Vehicle,
} from "./types";

const EMPTY: AcademicOptions = {
  academic_years: [],
  class_rooms: [],
  sections: [],
};

export interface AcademicOptionsState {
  options: AcademicOptions;
  loading: boolean;
  error: string | null;
}

export function useAcademicOptions(enabled = true): AcademicOptionsState {
  const [options, setOptions] = useState<AcademicOptions>(EMPTY);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiFetch<{ data: AcademicOptions }>(
          "/v1/reference/academic-options",
          { signal: controller.signal }
        );

        if (!active) {
          return;
        }

        setOptions(response.data);
      } catch (err: unknown) {
        if (!active || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }

        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load academic options."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [enabled]);

  return { options, loading, error };
}

interface ListLookupState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
}

function useCollection<T>(path: string | null): ListLookupState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(path !== null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (path === null) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiFetch<Paginated<T>>(path, {
          signal: controller.signal,
        });

        if (!active) {
          return;
        }

        setItems(response.data);
      } catch (err: unknown) {
        if (!active || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }

        setError(
          err instanceof ApiError ? err.message : "Unable to load options."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [path]);

  return { items, loading, error };
}

export function useChartOfAccounts(enabled = true): ListLookupState<ChartOfAccount> {
  return useCollection<ChartOfAccount>(
    enabled ? "/v1/chart-of-accounts?per_page=200" : null
  );
}

export function useFiscalYears(enabled = true): ListLookupState<FiscalYear> {
  return useCollection<FiscalYear>(enabled ? "/v1/fiscal-years?per_page=100" : null);
}

export function useExpenseCategories(
  enabled = true
): ListLookupState<ExpenseCategory> {
  return useCollection<ExpenseCategory>(
    enabled ? "/v1/expense-categories?is_active=1&per_page=200" : null
  );
}

export function useVendors(enabled = true): ListLookupState<Vendor> {
  return useCollection<Vendor>(enabled ? "/v1/vendors?is_active=1&per_page=200" : null);
}

function useAcademicCollection<T>(
  path: string,
  enabled = true
): ListLookupState<T> {
  return useCollection<T>(enabled ? path : null);
}

export function useAcademicYears(
  enabled = true
): ListLookupState<AcademicYear> {
  return useAcademicCollection<AcademicYear>(
    "/v1/academic-years?per_page=100",
    enabled
  );
}

export function useStages(enabled = true): ListLookupState<Stage> {
  return useAcademicCollection<Stage>("/v1/stages?per_page=200", enabled);
}

export function useClassRooms(enabled = true): ListLookupState<ClassRoom> {
  return useAcademicCollection<ClassRoom>("/v1/classes?per_page=200", enabled);
}

export function useSections(enabled = true): ListLookupState<Section> {
  return useAcademicCollection<Section>("/v1/sections?per_page=200", enabled);
}

export function useSubjects(enabled = true): ListLookupState<Subject> {
  return useAcademicCollection<Subject>("/v1/subjects?per_page=200", enabled);
}

export function useRooms(enabled = true): ListLookupState<Room> {
  return useAcademicCollection<Room>("/v1/rooms?per_page=200", enabled);
}

export function usePeriods(enabled = true): ListLookupState<Period> {
  return useAcademicCollection<Period>("/v1/periods?per_page=200", enabled);
}

export function useTerms(enabled = true): ListLookupState<Term> {
  return useAcademicCollection<Term>("/v1/terms?per_page=200", enabled);
}

export function useUsers(enabled = true): ListLookupState<User> {
  return useCollection<User>(enabled ? "/v1/users?per_page=200" : null);
}

export function useExamTypes(enabled = true): ListLookupState<ExamType> {
  return useCollection<ExamType>(
    enabled ? "/v1/exam-types?per_page=200" : null
  );
}

export function useGradeScales(enabled = true): ListLookupState<GradeScale> {
  return useCollection<GradeScale>(
    enabled ? "/v1/grade-scales?per_page=200" : null
  );
}

export function useExams(enabled = true): ListLookupState<Exam> {
  return useCollection<Exam>(enabled ? "/v1/exams?per_page=200" : null);
}

export function useExamPapers(enabled = true): ListLookupState<ExamPaper> {
  return useCollection<ExamPaper>(
    enabled ? "/v1/exam-papers?per_page=200" : null
  );
}

export function useStudents(enabled = true): ListLookupState<Student> {
  return useCollection<Student>(enabled ? "/v1/students?per_page=200" : null);
}

export function useSyllabusUnits(enabled = true): ListLookupState<SyllabusUnit> {
  return useCollection<SyllabusUnit>(
    enabled ? "/v1/syllabus-units?per_page=200" : null
  );
}

export function useScholarships(enabled = true): ListLookupState<Scholarship> {
  return useCollection<Scholarship>(
    enabled ? "/v1/scholarships?per_page=200" : null
  );
}

export function useBooks(enabled = true): ListLookupState<Book> {
  return useCollection<Book>(enabled ? "/v1/library/books?per_page=200" : null);
}

export function useLabs(enabled = true): ListLookupState<Lab> {
  return useCollection<Lab>(enabled ? "/v1/labs?per_page=200" : null);
}

export function useDepartments(enabled = true): ListLookupState<Department> {
  return useCollection<Department>(
    enabled ? "/v1/departments?per_page=200" : null
  );
}

export function useDesignations(enabled = true): ListLookupState<Designation> {
  return useCollection<Designation>(
    enabled ? "/v1/designations?per_page=200" : null
  );
}

export function useStaffMembers(enabled = true): ListLookupState<StaffMember> {
  return useCollection<StaffMember>(enabled ? "/v1/staff?per_page=200" : null);
}

export function useSalaryComponents(
  enabled = true
): ListLookupState<SalaryComponent> {
  return useCollection<SalaryComponent>(
    enabled ? "/v1/salary-components?per_page=200" : null
  );
}

export function useInventoryCategories(
  enabled = true
): ListLookupState<InventoryCategory> {
  return useCollection<InventoryCategory>(
    enabled ? "/v1/inventory/categories?per_page=200" : null
  );
}

export function useVehicles(enabled = true): ListLookupState<Vehicle> {
  return useCollection<Vehicle>(enabled ? "/v1/transport/vehicles?per_page=200" : null);
}

export function useTransportRoutes(
  enabled = true
): ListLookupState<TransportRoute> {
  return useCollection<TransportRoute>(
    enabled ? "/v1/transport/routes?per_page=200" : null
  );
}

export function useRouteStops(
  routeId: string | number | null,
  enabled = true
): ListLookupState<TransportRouteStop> {
  return useCollection<TransportRouteStop>(
    enabled && routeId ? `/v1/transport/routes/${routeId}/stops` : null
  );
}

export function useHostels(enabled = true): ListLookupState<Hostel> {
  return useCollection<Hostel>(enabled ? "/v1/hostels?per_page=200" : null);
}

export function useHostelRooms(
  hostelId: string | number | null,
  enabled = true
): ListLookupState<HostelRoom> {
  return useCollection<HostelRoom>(
    enabled && hostelId ? `/v1/hostels/${hostelId}/rooms?per_page=200` : null
  );
}

export function useCanteenItems(enabled = true): ListLookupState<CanteenItem> {
  return useCollection<CanteenItem>(
    enabled ? "/v1/canteen/items?per_page=200" : null
  );
}

export function useCanteenSuppliers(
  enabled = true
): ListLookupState<CanteenSupplier> {
  return useCollection<CanteenSupplier>(
    enabled ? "/v1/canteen/suppliers?per_page=200" : null
  );
}

export function useSports(enabled = true): ListLookupState<Sport> {
  return useCollection<Sport>(enabled ? "/v1/sports?per_page=200" : null);
}

export function useSportTeams(
  sportId?: string | number | null
): ListLookupState<SportTeam> {
  const query = sportId ? `?sport_id=${sportId}&per_page=200` : "?per_page=200";

  return useCollection<SportTeam>(`/v1/sports/teams${query}`);
}

export function useStudentClubs(
  enabled = true
): ListLookupState<StudentClub> {
  return useCollection<StudentClub>(
    enabled ? "/v1/student-affairs/clubs?per_page=200" : null
  );
}

export function useStudentEvents(
  enabled = true
): ListLookupState<StudentEvent> {
  return useCollection<StudentEvent>(
    enabled ? "/v1/student-affairs/events?per_page=200" : null
  );
}

export function useRoleOptions(enabled = true): ListLookupState<RoleOption> {
  return useCollection<RoleOption>(enabled ? "/v1/meta/roles" : null);
}

export function useCampuses(enabled = true): ListLookupState<Campus> {
  return useCollection<Campus>(enabled ? "/v1/campuses?per_page=200" : null);
}

export function useInstitutions(enabled = true): ListLookupState<Institution> {
  return useCollection<Institution>(
    enabled ? "/v1/institutions?per_page=200" : null
  );
}

export interface PermissionCatalogState {
  items: string[];
  modules: string[];
  loading: boolean;
  error: string | null;
}

export function usePermissionCatalog(enabled = true): PermissionCatalogState {
  const [state, setState] = useState<PermissionCatalogState>({
    items: [],
    modules: [],
    loading: enabled,
    error: null,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    const run = async () => {
      setState((current) => ({ ...current, loading: true, error: null }));

      try {
        const response = await apiFetch<{ data: string[]; modules: string[] }>(
          "/v1/meta/permissions",
          { signal: controller.signal }
        );

        if (!active) {
          return;
        }

        setState({
          items: response.data,
          modules: response.modules ?? [],
          loading: false,
          error: null,
        });
      } catch (err: unknown) {
        if (!active || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }

        setState({
          items: [],
          modules: [],
          loading: false,
          error:
            err instanceof ApiError
              ? err.message
              : "Unable to load permissions.",
        });
      }
    };

    void run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [enabled]);

  return state;
}
