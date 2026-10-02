import { useState } from "react";
import { useTranslation } from "@eis/i18n";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Card, ErrorText, GhostButton, PrimaryButton } from "../components/ui";
import { useTr } from "../lib/i18n";
import { useTheme } from "../theme/ThemeProvider";
import { ApiError } from "../lib/api";
import { buildPayload, initialValues } from "./form";
import { Field } from "./fields/Field";
import type { AdminRecord, InputFieldConfig } from "./types";

export function ActionFormModal({
  title,
  fields,
  record,
  submitLabel,
  onClose,
  onSubmit,
}: {
  title: string;
  fields: InputFieldConfig[];
  record: AdminRecord;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const tr = useTr();
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    initialValues(fields)
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const nextErrors: Record<string, string[]> = {};
    for (const field of fields) {
      if (!field.required) {
        continue;
      }
      const value = values[field.name];
      if (value === "" || value === null || value === undefined) {
        nextErrors[field.name] = [t("errors.required")];
      }
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setBanner(t("admin.form.fixErrors"));
      return;
    }

    setSaving(true);
    setErrors({});
    setBanner(null);
    try {
      await onSubmit(buildPayload(fields, values, false));
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors(caught.errors ?? {});
        setBanner(caught.message);
      } else {
        setBanner(t("admin.action.failed"));
      }
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>{tr(title)}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" hitSlop={10}>
              <Text style={{ color: colors.muted, fontSize: 18, fontWeight: "700" }}>x</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {banner ? <ErrorText message={banner} /> : null}
            <Card>
              {fields.map((field) => (
                <Field
                  key={field.name}
                  field={field}
                  value={values[field.name]}
                  onChange={(value) => setValues((previous) => ({ ...previous, [field.name]: value }))}
                  error={errors[field.name]?.[0]}
                  record={values}
                />
              ))}
            </Card>
          </ScrollView>

          {saving ? (
            <ActivityIndicator color={colors.accent} style={styles.saving} />
          ) : (
            <PrimaryButton
              label={submitLabel ? tr(submitLabel) : tr(title)}
              onPress={() => void submit()}
            />
          )}
          <GhostButton label={t("common.cancel")} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  dialog: {
    borderRadius: 14,
    padding: 18,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingBottom: 8,
  },
  saving: {
    marginVertical: 12,
  },
});
