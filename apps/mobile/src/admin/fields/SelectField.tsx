import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import type { SelectOption } from "../types";
import { toText } from "./common";

export function SelectField({
  label,
  options,
  value,
  onChange,
  error,
  required,
  placeholder = "Select",
}: {
  label: string;
  options: SelectOption[];
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => String(option.value) === toText(value));

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.muted }]}>
        {label}
        {required ? " *" : ""}
      </Text>

      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={[
          styles.control,
          { borderColor: error ? colors.danger : colors.border, backgroundColor: colors.surface },
        ]}
      >
        <Text style={{ color: selected ? colors.foreground : colors.muted, fontSize: 15 }}>
          {selected ? selected.label : placeholder}
        </Text>
      </Pressable>

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => undefined}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              style={{ maxHeight: 360 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={{ color: colors.muted, padding: 12 }}>No options available.</Text>
              }
              renderItem={({ item }) => {
                const active = String(item.value) === toText(value);
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    style={[
                      styles.option,
                      active ? { backgroundColor: colors.accentSoft } : null,
                    ]}
                  >
                    <Text style={{ color: active ? colors.accent : colors.foreground, fontSize: 15 }}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
            {!required ? (
              <Pressable
                onPress={() => {
                  onChange("");
                  setOpen(false);
                }}
                style={styles.clear}
              >
                <Text style={{ color: colors.muted, fontSize: 14 }}>Clear selection</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
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
  control: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 46,
    justifyContent: "center",
  },
  error: {
    marginTop: 6,
    fontSize: 13,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    borderRadius: 14,
    padding: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    padding: 8,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 8,
  },
  clear: {
    padding: 12,
    alignItems: "center",
  },
});
