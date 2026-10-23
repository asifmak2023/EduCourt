import { useCallback, useState } from "react";
import { useTranslation } from "@eis/i18n";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Card, EmptyState, ErrorText, GhostButton, PrimaryButton, SectionLabel } from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api";
import { relativeAcademicYears } from "../../lib/academicYear";
import { useCampusId } from "../../lib/campus";
import { useTheme } from "../../theme/ThemeProvider";
import { LookupField } from "../fields/LookupField";
import type { SelectOption } from "../types";

interface Candidate {
  id: number;
  full_name?: string;
  admission_no?: string;
  status?: string | null;
}

export function PromotionsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const campusId = useCampusId();

  const [fromYear, setFromYear] = useState<unknown>("");
  const [fromClass, setFromClass] = useState<unknown>("");
  const [toYear, setToYear] = useState<unknown>("");
  const [toClass, setToClass] = useState<unknown>("");
  const [toSection, setToSection] = useState<unknown>("");

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canLoad = Boolean(fromYear) && Boolean(fromClass);
  const fromYearOptions = useCallback(
    (options: SelectOption[]) => relativeAcademicYears(options, 2, 0),
    []
  );
  const toYearOptions = useCallback(
    (options: SelectOption[]) => relativeAcademicYears(options, 0, 1),
    []
  );

  const loadStudents = useCallback(async () => {
    if (!canLoad) {
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    setSelectedIds([]);
    try {
      const query = `?academic_year_id=${fromYear}&class_room_id=${fromClass}&per_page=200`;
      const response = await apiFetch<{ data: Candidate[] }>(`/v1/students${query}`, {
        campusId,
      });
      setCandidates(response.data);
      setLoaded(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("admin.promotions.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [canLoad, fromYear, fromClass, campusId, t]);

  const toggleSelected = (id: number) => {
    setSelectedIds((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id]
    );
  };

  const promote = async () => {
    if (!toYear || !toClass) {
      setError(t("admin.promotions.selectTarget"));
      return;
    }
    if (selectedIds.length === 0) {
      setError(t("admin.promotions.selectStudents"));
      return;
    }
    setPromoting(true);
    setError(null);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = {
        from_academic_year_id: Number(fromYear),
        to_academic_year_id: Number(toYear),
        from_class_room_id: Number(fromClass),
        to_class_room_id: Number(toClass),
        student_ids: selectedIds,
      };
      if (toSection) {
        payload.section_id = Number(toSection);
      }
      const response = await apiFetch<{ message: string; promoted: number }>(
        "/v1/students/promote",
        { method: "POST", body: payload, campusId }
      );
      setMessage(response.message ?? t("admin.promotions.promoted", { count: response.promoted }));
      setLoaded(false);
      setCandidates([]);
      setSelectedIds([]);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("admin.promotions.promoteFailed"));
    } finally {
      setPromoting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {error ? <ErrorText message={error} /> : null}
      {message ? (
        <Text style={{ color: colors.accent, fontWeight: "600", fontSize: 14, marginBottom: 8 }}>
          {message}
        </Text>
      ) : null}

      <Card>
        <SectionLabel>{t("admin.promotions.from")}</SectionLabel>
        <LookupField
          label="Academic year"
          lookup="academicYears"
          value={fromYear}
          onChange={setFromYear}
          required
          filterOptions={fromYearOptions}
        />
        <LookupField
          label="Class"
          lookup="classRooms"
          value={fromClass}
          onChange={setFromClass}
          required
        />
        <PrimaryButton
          label={t("admin.promotions.load")}
          onPress={() => void loadStudents()}
          loading={loading}
        />
      </Card>

      {loaded ? (
        <View style={styles.candidates}>
          <SectionLabel>{t("admin.promotions.candidates", { count: candidates.length })}</SectionLabel>
          {candidates.length === 0 ? (
            <EmptyState message={t("admin.promotions.empty")} />
          ) : (
            candidates.map((candidate) => {
              const selected = selectedIds.includes(candidate.id);
              return (
                <Pressable
                  key={candidate.id}
                  onPress={() => toggleSelected(candidate.id)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={t("admin.promotions.promotedLabel")}
                  accessibilityState={{ checked: selected }}
                  style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}
                >
                  <View>
                    <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 14 }}>
                      {candidate.full_name ?? t("admin.promotions.studentHash", { id: candidate.id })}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      {[candidate.admission_no, candidate.status].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: selected ? colors.accent : colors.border,
                        backgroundColor: selected ? colors.accent : "transparent",
                      },
                    ]}
                  >
                    {selected ? (
                      <Text style={{ color: colors.accentForeground, fontSize: 12, fontWeight: "700" }}>x</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      ) : null}

      <Card>
        <SectionLabel>{t("admin.promotions.to")}</SectionLabel>
        <LookupField
          label="Academic year"
          lookup="academicYears"
          value={toYear}
          onChange={setToYear}
          required
          autoDefault={false}
          filterOptions={toYearOptions}
        />
        <LookupField
          label="Class"
          lookup="classRooms"
          value={toClass}
          onChange={setToClass}
          required
        />
        <LookupField
          label="Section"
          lookup="sections"
          value={toSection}
          onChange={setToSection}
          dependsValue={toClass}
        />
      </Card>

      <PrimaryButton
        label={t("admin.promotions.promote")}
        onPress={() => void promote()}
        loading={promoting}
      />
      <GhostButton
        label={t("common.reset")}
        onPress={() => {
          setCandidates([]);
          setSelectedIds([]);
          setLoaded(false);
          setMessage(null);
          setError(null);
        }}
      />

      <Text style={[styles.hint, { color: colors.muted }]}>
        {t("admin.promotions.hint")}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  candidates: {
    marginTop: 20,
    gap: 8,
  },
  row: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    marginTop: 14,
    fontSize: 12,
    textAlign: "center",
  },
});
