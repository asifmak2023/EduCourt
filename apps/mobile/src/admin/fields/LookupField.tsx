import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { lookupDependsOn, useLookup } from "../useLookups";
import { toText } from "./common";

export function LookupField({
  label,
  lookup,
  value,
  onChange,
  error,
  required,
  dependsValue,
}: {
  label: string;
  lookup: string;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  required?: boolean;
  dependsValue?: unknown;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const depParam = lookupDependsOn(lookup);
  const blocked = Boolean(depParam) && (dependsValue === null || dependsValue === undefined || dependsValue === "");
  const { options, loading, error: loadError } = useLookup(lookup, blocked ? null : (dependsValue as string | number | null));

  const selected = options.find((option) => String(option.value) === toText(value));

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return options;
    }
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }, [options, query]);

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.muted }]}>
        {label}
        {required ? " *" : ""}
      </Text>

      <Pressable
        disabled={blocked}
        onPress={() => {
          setQuery("");
          setOpen(true);
        }}
        accessibilityRole="button"
        style={[
          styles.control,
          {
            borderColor: error ? colors.danger : colors.border,
            backgroundColor: colors.surface,
            opacity: blocked ? 0.6 : 1,
          },
        ]}
      >
        <Text style={{ color: selected || toText(value) ? colors.foreground : colors.muted, fontSize: 15 }}>
          {selected ? selected.label : toText(value) ? `#${toText(value)}` : "Select"}
        </Text>
      </Pressable>

      {blocked ? (
        <Text style={[styles.hint, { color: colors.muted }]}>Select the parent record first.</Text>
      ) : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => undefined}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{label}</Text>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor={colors.muted}
              autoCorrect={false}
              style={[
                styles.search,
                { borderColor: colors.border, color: colors.foreground },
              ]}
            />

            {loading ? (
              <ActivityIndicator color={colors.accent} style={{ padding: 16 }} />
            ) : loadError ? (
              <Text style={{ color: colors.danger, padding: 12 }}>{loadError}</Text>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.value)}
                style={{ maxHeight: 340 }}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={{ color: colors.muted, padding: 12 }}>No matches.</Text>
                }
                renderItem={({ item }) => {
                  const active = String(item.value) === toText(value);
                  return (
                    <Pressable
                      onPress={() => {
                        onChange(item.value);
                        setOpen(false);
                      }}
                      style={[styles.option, active ? { backgroundColor: colors.accentSoft } : null]}
                    >
                      <Text style={{ color: active ? colors.accent : colors.foreground, fontSize: 15 }}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            )}

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
  hint: {
    marginTop: 6,
    fontSize: 12,
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
  search: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
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
