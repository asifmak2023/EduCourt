"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "./api";
import type {
  AcademicOptions,
  AcademicYear,
  Book,
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
  Lab,
  Paginated,
  Period,
  Room,
  Scholarship,
  Section,
  Stage,
  Student,
  Subject,
  SyllabusUnit,
  Term,
  User,
  Vendor,
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
