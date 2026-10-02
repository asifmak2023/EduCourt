import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "@eis/i18n";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Card, ErrorText, GhostButton, PrimaryButton } from "../components/ui";
import { ApiError, apiFetch } from "../lib/api";
import { useCampusId } from "../lib/campus";
import { useTr } from "../lib/i18n";
import {
  groupToggleKey,
  initialValues,
  isPlainField,
  mergeRecord,
  resolveFormPayload,
  validateNestedFields,
} from "./form";
import { Field } from "./fields/Field";
import { GroupField } from "./fields/GroupField";
import { RepeaterField } from "./fields/RepeaterField";
import { useResource } from "./useResource";
import type { AdminRecord, ModuleConfig } from "./types";

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
  const { t } = useTranslation();
  const tr = useTr();
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
    () => config.fields.filter(isPlainField),
    [config.fields]
  );
  const repeaterFields = useMemo(
    () => config.fields.filter((field) => field.type === "repeater"),
    [config.fields]
  );
  const groupFields = useMemo(
    () => config.fields.filter((field) => field.type === "group"),
    [config.fields]
  );

  const values: Record<string, unknown> =
    edited ??
    (data ? mergeRecord(config.fields, data) : initialValues(config.fields));

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
        nextErrors[field.name] = [t("errors.required")];
      }
    }
    Object.assign(
      nextErrors,
      validateNestedFields(config.fields, values, editing, { t, tr })
    );
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setBanner(t("admin.form.fixErrors"));
      return;
    }

    setSaving(true);
    setErrors({});
    setBanner(null);

    try {
      const payload = await resolveFormPayload(
        config.fields,
        values,
        editing,
        async (endpoint, body) => {
          const response = await apiFetch<{ data: { id: number } }>(endpoint, {
            method: "POST",
            body,
            campusId,
          });
          return response.data.id;
        }
      );
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
        setBanner(t("admin.form.saveFailed"));
      }
    } finally {
      setSaving(false);
    }
  }, [inputFields, config, values, editing, recordId, campusId, onSaved, t, tr]);

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

      {repeaterFields.map((field) => (
        <RepeaterField
          key={field.name}
          field={field}
          rows={
            Array.isArray(values[field.name])
              ? (values[field.name] as Record<string, unknown>[])
              : []
          }
          onChange={(rows) => setValue(field.name, rows)}
          record={values}
        />
      ))}
      {repeaterFields.map((field) =>
        errors[field.name]?.[0] ? (
          <Text key={`${field.name}-error`} style={[styles.error, { color: colors.danger }]}>
            {errors[field.name]?.[0]}
          </Text>
        ) : null
      )}

      {groupFields
        .filter((field) => !(editing && field.createOnly))
        .map((field) => (
          <GroupField
            key={field.name}
            field={field}
            values={(values[field.name] as Record<string, unknown>) ?? {}}
            enabled={
              values[groupToggleKey(field.name)] === true ||
              values[groupToggleKey(field.name)] === 1 ||
              values[groupToggleKey(field.name)] === "1"
            }
            onToggle={(enabled) => setValue(groupToggleKey(field.name), enabled)}
            onChange={(nested) => setValue(field.name, nested)}
            record={values}
          />
        ))}

      <PrimaryButton
        label={editing ? t("admin.form.saveChanges") : t("common.create")}
        onPress={() => void submit()}
        loading={saving}
      />
      <GhostButton label={t("common.cancel")} onPress={onCancel} />

      <Text style={[styles.hint, { color: colors.muted }]}>
        {t("admin.form.requiredHint")}
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
  error: {
    marginTop: 8,
    fontSize: 13,
  },
  hint: {
    marginTop: 14,
    fontSize: 12,
    textAlign: "center",
  },
});
