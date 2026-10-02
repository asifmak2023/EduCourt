import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Card, ErrorText, GhostButton, PrimaryButton, SectionLabel } from "../components/ui";
import { apiFetch } from "../lib/api";
import { useCampusId } from "../lib/campus";
import { formatDate } from "../lib/format";
import { can } from "../lib/nav";
import { getPath } from "./display";
import { useResource } from "./useResource";
import type { AdminRecord, FieldConfig, ModuleConfig } from "./types";

function displayValue(field: FieldConfig, value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (field.type === "checkbox") {
    return value ? "Yes" : "No";
  }
  if (field.type === "select") {
    return field.options.find((option) => String(option.value) === String(value))?.label ?? String(value);
  }
  if (field.type === "date") {
    return formatDate(String(value));
  }
  if (field.type === "lookup") {
    return `#${String(value)}`;
  }
  return String(value);
}

export function ModuleDetailScreen({
  config,
  id,
  permissions,
  onEdit,
  onDeleted,
}: {
  config: ModuleConfig;
  id: number;
  permissions: string[];
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const { colors } = useTheme();
  const campusId = useCampusId();
  const { data, loading, error, reload } = useResource<AdminRecord>(config.endpoint, id);
  const [pending, setPending] = useState<{ message: string; run: () => Promise<void> } | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canEdit = Boolean(config.permissions.edit) && can(permissions, config.permissions.edit);
  const canDelete = Boolean(config.permissions.delete) && can(permissions, config.permissions.delete);

  const runDelete = useCallback(async () => {
    setBusy(true);
    setActionError(null);
    try {
      await apiFetch(`${config.endpoint}/${id}`, { method: "DELETE", campusId });
      onDeleted();
    } catch {
      setActionError("Unable to delete this record.");
    } finally {
      setBusy(false);
    }
  }, [config.endpoint, id, campusId, onDeleted]);

  if (loading) {
    return <ActivityIndicator color={colors.accent} style={styles.loader} />;
  }

  if (error || !data) {
    return (
      <View style={styles.padded}>
        <ErrorText message={error ?? "Record not found."} />
        <GhostButton label="Retry" onPress={reload} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {actionError ? (
        <View style={styles.padded}>
          <ErrorText message={actionError} />
        </View>
      ) : null}

      <Card>
        {config.fields.map((field) => (
          <View key={field.name} style={styles.row}>
            <SectionLabel>{field.label}</SectionLabel>
            <Text style={[styles.value, { color: colors.foreground }]}>
              {field.displayKey
                ? String(getPath(data, field.displayKey) ?? "-")
                : displayValue(field, getPath(data, field.name))}
            </Text>
          </View>
        ))}
      </Card>

      {config.actions?.map((action) => {
        if (action.permission && !can(permissions, action.permission)) {
          return null;
        }
        return (
          <GhostButton
            key={action.label}
            label={action.label}
            onPress={() =>
              setPending({
                message: action.confirm ?? `Run "${action.label}"?`,
                run: async () => {
                  const path =
                    typeof action.path === "function" ? action.path(data) : action.path;
                  const body =
                    typeof action.body === "function" ? action.body(data) : action.body;
                  await apiFetch(path, { method: action.method ?? "POST", body, campusId });
                  reload();
                },
              })
            }
          />
        );
      })}

      {canEdit ? (
        <PrimaryButton label="Edit" onPress={onEdit} />
      ) : null}
      {canDelete ? (
        <GhostButton
          label="Delete"
          tone="danger"
          onPress={() =>
            setPending({
              message: config.deleteMessage ?? "Delete this record? This cannot be undone.",
              run: runDelete,
            })
          }
        />
      ) : null}

      <Modal visible={pending !== null} transparent animationType="fade" onRequestClose={() => setPending(null)}>
        <View style={styles.backdrop}>
          <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.foreground, fontSize: 15 }}>{pending?.message}</Text>
            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => setPending(null)}
                style={[styles.dialogButton, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={() => {
                  const current = pending;
                  setPending(null);
                  if (current) {
                    void current.run();
                  }
                }}
                style={[styles.dialogButton, { borderColor: colors.danger, backgroundColor: colors.danger }]}
              >
                {busy ? (
                  <ActivityIndicator color={colors.accentForeground} />
                ) : (
                  <Text style={{ color: colors.accentForeground, fontWeight: "600" }}>Confirm</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  loader: {
    marginTop: 40,
  },
  padded: {
    padding: 20,
  },
  row: {
    marginTop: 14,
  },
  value: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "600",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  dialog: {
    borderRadius: 14,
    padding: 18,
  },
  dialogActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  dialogButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
