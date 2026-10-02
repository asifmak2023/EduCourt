import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { DateField } from "./DateField";
import { LookupField } from "./LookupField";
import { MultiSelectField } from "./MultiSelectField";
import { SelectField } from "./SelectField";
import { isTruthy, toNumberOrEmpty, toText, type FieldInputProps } from "./common";

export function Field(props: FieldInputProps) {
  const { field } = props;
  const { colors } = useTheme();

  if (field.type === "select") {
    return (
      <SelectField
        label={field.label}
        options={field.options}
        value={props.value}
        onChange={props.onChange}
        error={props.error}
        required={field.required}
      />
    );
  }

  if (field.type === "date" || field.type === "time") {
    return (
      <DateField
        label={field.label}
        mode={field.type}
        value={props.value}
        onChange={props.onChange}
        error={props.error}
        required={field.required}
      />
    );
  }

  if (field.type === "lookup") {
    return (
      <LookupField
        label={field.label}
        lookup={field.lookup}
        value={props.value}
        onChange={props.onChange}
        error={props.error}
        required={field.required}
        dependsValue={field.dependsOn ? props.record[field.dependsOn] : undefined}
      />
    );
  }

  if (field.type === "multiselect") {
    return (
      <MultiSelectField
        label={field.label}
        options={field.options}
        value={props.value}
        onChange={props.onChange}
        error={props.error}
        required={field.required}
      />
    );
  }

  if (field.type === "checkbox") {
    const checked = isTruthy(props.value);
    return (
      <View style={styles.field}>
        <Pressable
          onPress={() => props.onChange(!checked)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          style={styles.checkboxRow}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: checked ? colors.accent : colors.border,
                backgroundColor: checked ? colors.accent : "transparent",
              },
            ]}
          >
            {checked ? (
              <Text style={{ color: colors.accentForeground, fontSize: 12, fontWeight: "700" }}>x</Text>
            ) : null}
          </View>
          <Text style={{ color: colors.foreground, fontSize: 15 }}>{field.label}</Text>
        </Pressable>
        {props.error ? (
          <Text style={[styles.error, { color: colors.danger }]}>{props.error}</Text>
        ) : null}
      </View>
    );
  }

  const multiline = field.type === "textarea";
  const keyboardType =
    field.type === "number"
      ? "numeric"
      : field.type === "email"
      ? "email-address"
      : "default";

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.muted }]}>
        {field.label}
        {field.required ? " *" : ""}
      </Text>
      <TextInput
        value={toText(props.value)}
        onChangeText={(text) => props.onChange(field.type === "number" ? toNumberOrEmpty(text) : text)}
        placeholder={field.type === "number" ? (field.placeholder ?? "0") : field.placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.input,
          multiline ? styles.textarea : null,
          {
            borderColor: props.error ? colors.danger : colors.border,
            backgroundColor: colors.surface,
            color: colors.foreground,
          },
        ]}
      />
      {field.hint ? (
        <Text style={[styles.hint, { color: colors.muted }]}>{field.hint}</Text>
      ) : null}
      {props.error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{props.error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginTop: 16,
  },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textarea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  hint: {
    marginTop: 6,
    fontSize: 12,
  },
  error: {
    marginTop: 6,
    fontSize: 13,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
