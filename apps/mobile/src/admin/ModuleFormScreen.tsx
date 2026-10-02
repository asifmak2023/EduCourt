import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Card, ErrorText, GhostButton, PrimaryButton } from "../components/ui";
import { ApiError, apiFetch } from "../lib/api";
import { useCampusId } from "../lib/campus";
import { buildPayload, initialValues, mergeRecord } from "./form";
import { Field } from "./fields/Field";
import { useResource } from "./useResource";
import type {
  AdminRecord,
  InputFieldConfig,
  ModuleConfig,
} from "./types";

export function ModuleFormScreen({
  config,
  recordId,
  onSaved,
  onCancel,
}: {
  config: ModuleConfig;
  recordId?: number | null;
  onSaved: (item: AdminRecord) => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const campusId = useCampusId();
  const editing = recordId !== null && recordId !== undefined;
  const { data, loading } = useResource<AdminRecord>(
    editing ? config.endpoint : null,
    recordId
  );

  const [edited, setEdited] = useState<Record<string, unknown> | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const inputFields = useMemo(
    () =>
      config.fields.filter(
        (field): field is InputFieldConfig => field.type !== "photo"
      ),
    [config.fields]
  );

  const values: Record<string, unknown> =
    edited ??
    (data ? mergeRecord(inputFields, data) : initialValues(inputFields));

  const setValue = useCallback(
    (name: string, value: unknown) => {
      setEdited((previous) => ({ ...(previous ?? values), [name]: value }));
    },
    [values]
  );

  const submit = useCallback(async () => {
    const nextErrors: Record<string, string[]> = {};
    for (const field of inputFields) {
      if (!field.required) {
        continue;
      }
      const value = values[field.name];
      if (value === "" || value === null || value === undefined) {
        nextErrors[field.name] = ["This field is required."];
      }
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setBanner("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    setErrors({});
    setBanner(null);

    try {
      const payload = buildPayload(inputFields, values, editing);
      const response = editing
        ? await apiFetch<{ data: AdminRecord }>(`${config.endpoint}/${recordId}`, {
            method: "PUT",
            body: payload,
            campusId,
          })
        : await apiFetch<{ data: AdminRecord }>(config.endpoint, {
            method: "POST",
            body: payload,
            campusId,
          });
      onSaved(response.data);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors(caught.errors ?? {});
        setBanner(caught.message);
      } else {
        setBanner("Unable to save. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }, [inputFields, config.endpoint, values, editing, recordId, campusId, onSaved]);

  if (editing && loading) {
    return <ActivityIndicator color={colors.accent} style={styles.loader} />;
  }

  return (
    <View style={styles.container}>
      {banner ? (
        <View style={styles.banner}>
          <ErrorText message={banner} />
        </View>
      ) : null}

      <Card>
        {inputFields.map((field) => (
          <Field
            key={field.name}
            field={field}
            value={values[field.name]}
            onChange={(value) => setValue(field.name, value)}
            error={errors[field.name]?.[0]}
            record={values}
          />
        ))}
      </Card>

      <PrimaryButton
        label={editing ? "Save changes" : "Create"}
        onPress={() => void submit()}
        loading={saving}
      />
      <GhostButton label="Cancel" onPress={onCancel} />

      <Text style={[styles.hint, { color: colors.muted }]}>
        Fields marked * are required.
      </Text>
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
  banner: {
    marginBottom: 4,
  },
  hint: {
    marginTop: 14,
    fontSize: 12,
    textAlign: "center",
  },
});
