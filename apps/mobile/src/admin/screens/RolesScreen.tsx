import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, EmptyState, ErrorText, PrimaryButton, SectionLabel, TextField } from "../../components/ui";
import { SelectFilter } from "../../components/table";
import { apiFetch } from "../../lib/api";
import { useCampusId } from "../../lib/campus";
import { useAsync } from "../../lib/useAsync";
import { useTheme } from "../../theme/ThemeProvider";
import { LookupField } from "../fields/LookupField";
import { ROLE_OPTIONS } from "../administration";

interface RoleOption {
  value: string;
  label: string;
}

interface ScopeAssignment {
  id: number;
  user_id: number;
  role?: string | null;
  role_label?: string | null;
  scope_type?: string | null;
  scope_id?: number | null;
  campus_id?: number | null;
  campus?: { name?: string } | null;
}

interface MetaScopes {
  scope_types: RoleOption[];
}

export function RolesScreen({ permissions }: { permissions: string[] }) {
  const { colors } = useTheme();
  const campusId = useCampusId();
  const canEdit = permissions.includes("role.edit");

  const [grantUser, setGrantUser] = useState<unknown>("");
  const [grantRole, setGrantRole] = useState("");
  const [grantCampus, setGrantCampus] = useState<unknown>("");
  const [grantScopeType, setGrantScopeType] = useState("campus");
  const [grantScopeId, setGrantScopeId] = useState<unknown>("");
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const metaLoader = useCallback(async () => {
    const [roles, perms, scopes] = await Promise.all([
      apiFetch<{ data: RoleOption[] }>("/v1/meta/roles", { campusId }),
      apiFetch<{ data: string[]; modules: string[] }>("/v1/meta/permissions", { campusId }),
      apiFetch<{ data: MetaScopes }>("/v1/meta/scopes", { campusId }),
    ]);
    return { roles: roles.data, perms: perms.data, modules: perms.modules, scopeTypes: scopes.data.scope_types };
  }, [campusId]);
  const meta = useAsync(metaLoader, [campusId]);

  const assignmentLoader = useCallback(async () => {
    const response = await apiFetch<{ data: ScopeAssignment[] }>(
      "/v1/scope-assignments?per_page=50",
      { campusId }
    );
    return response.data;
  }, [campusId]);
  const assignments = useAsync<ScopeAssignment[]>(assignmentLoader, [campusId, nonce]);

  const grant = useCallback(async () => {
    setFormError(null);
    setNotice(null);
    if (!grantUser || !grantRole || !grantScopeType) {
      setFormError("User, role and scope type are required.");
      return;
    }
    const body: Record<string, unknown> = {
      user_id: grantUser,
      role: grantRole,
      scope_type: grantScopeType,
    };
    if (grantCampus) {
      body.campus_id = grantCampus;
    }
    if (grantScopeId) {
      body.scope_id = grantScopeId;
    }
    try {
      await apiFetch("/v1/scope-assignments", { method: "POST", body, campusId });
      setNotice("Scope assignment granted.");
      setGrantUser("");
      setGrantRole("");
      setGrantCampus("");
      setGrantScopeId("");
      setNonce((value) => value + 1);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Failed to grant assignment.");
    }
  }, [grantUser, grantRole, grantScopeType, grantCampus, grantScopeId, campusId]);

  const revoke = useCallback(
    async (id: number) => {
      setFormError(null);
      try {
        await apiFetch(`/v1/scope-assignments/${id}`, { method: "DELETE", campusId });
        setNotice("Scope assignment revoked.");
        setNonce((value) => value + 1);
      } catch (caught) {
        setFormError(caught instanceof Error ? caught.message : "Failed to revoke assignment.");
      }
    },
    [campusId]
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {notice ? <Text style={{ color: colors.accent, fontWeight: "600" }}>{notice}</Text> : null}
      {formError ? <ErrorText message={formError} /> : null}

      <Card>
        <SectionLabel>Role catalogue</SectionLabel>
        {meta.loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} /> : null}
        {meta.data?.roles.map((role) => (
          <Text key={role.value} style={{ color: colors.foreground, fontSize: 14, marginTop: 6 }}>
            {role.label}
          </Text>
        ))}
      </Card>

      <Card>
        <SectionLabel>Permissions</SectionLabel>
        {meta.data ? (
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>
            {meta.data.perms.length} permissions across {meta.data.modules.length} modules
          </Text>
        ) : null}
        <View style={styles.chips}>
          {meta.data?.modules.map((module) => (
            <Text
              key={module}
              style={[styles.chip, { color: colors.foreground, borderColor: colors.border }]}
            >
              {module}
            </Text>
          ))}
        </View>
      </Card>

      <Card>
        <SectionLabel>Scope assignments</SectionLabel>
        {assignments.loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} /> : null}
        {assignments.data && assignments.data.length === 0 ? (
          <EmptyState message="No scope assignments." />
        ) : null}
        {assignments.data?.map((assignment) => (
          <View key={assignment.id} style={[styles.assignmentRow, { borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 13 }}>
                {assignment.role_label ?? assignment.role ?? "Role"}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {[`User #${assignment.user_id}`, assignment.scope_type, assignment.campus?.name]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
            {canEdit ? (
              <Text
                onPress={() => void revoke(assignment.id)}
                style={{ color: colors.danger, fontWeight: "600", fontSize: 13 }}
              >
                Revoke
              </Text>
            ) : null}
          </View>
        ))}
      </Card>

      {canEdit ? (
        <Card>
          <SectionLabel>Grant assignment</SectionLabel>
          <LookupField label="User" lookup="staffUsers" value={grantUser} onChange={setGrantUser} required />
          <SelectFilter
            label="Role"
            value={grantRole}
            options={ROLE_OPTIONS}
            onChange={setGrantRole}
            anyLabel="Select role"
          />
          <LookupField label="Campus" lookup="campuses" value={grantCampus} onChange={setGrantCampus} />
          <SelectFilter
            label="Scope type"
            value={grantScopeType}
            options={meta.data?.scopeTypes ?? [{ value: "campus", label: "Campus" }]}
            onChange={setGrantScopeType}
            anyLabel="Select scope"
          />
          <TextField
            label="Scope ID"
            value={String(grantScopeId ?? "")}
            onChangeText={(value) => setGrantScopeId(value.replace(/[^0-9]/g, ""))}
          />
          <PrimaryButton label="Grant" onPress={() => void grant()} />
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
  },
  assignmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
});
