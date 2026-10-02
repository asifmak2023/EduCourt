import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Card, EmptyState, ErrorText } from "../components/ui";
import { formatDate, formatMoney } from "../lib/format";
import { can } from "../lib/nav";
import { getPath } from "./display";
import { useList, type ListMeta } from "./useList";
import type { AdminRecord, ColumnConfig, ModuleConfig } from "./types";

function formatColumn(value: unknown, format?: ColumnConfig["format"]): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (format === "money") {
    return formatMoney(value as string | number);
  }
  if (format === "date") {
    return formatDate(String(value));
  }
  if (format === "number") {
    return String(value);
  }
  return String(value);
}

export function ModuleListScreen({
  config,
  permissions,
  onOpen,
  onCreate,
}: {
  config: ModuleConfig;
  permissions: string[];
  onOpen: (id: number) => void;
  onCreate: () => void;
}) {
  const { colors } = useTheme();
  const list = useList<AdminRecord>({
    endpoint: config.endpoint,
    initialFilters: Object.fromEntries(
      (config.filters ?? []).map((filter) => [filter.param, null])
    ),
  });

  const meta: ListMeta | null = list.meta;
  const canCreate = Boolean(config.permissions.create) && can(permissions, config.permissions.create);

  return (
    <View style={styles.container}>
      {config.searchable ? (
        <TextInput
          value={list.search}
          onChangeText={list.setSearch}
          placeholder="Search"
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          style={[
            styles.search,
            { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground },
          ]}
        />
      ) : null}

      {(config.filters?.length || canCreate) ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {config.filters?.map((filter) => {
            const active = list.filters[filter.param] ?? null;
            return (
              <View key={filter.param} style={styles.filterGroup}>
                {filter.options.map((option) => {
                  const isActive = String(active) === String(option.value);
                  return (
                    <Pressable
                      key={`${filter.param}-${option.value}`}
                      onPress={() =>
                        list.setFilter(filter.param, isActive ? null : option.value)
                      }
                      style={[
                        styles.chip,
                        {
                          borderColor: isActive ? colors.accent : colors.border,
                          backgroundColor: isActive ? colors.accentSoft : colors.surface,
                        },
                      ]}
                    >
                      <Text style={{ color: isActive ? colors.accent : colors.muted, fontSize: 13 }}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            );
          })}

          {canCreate ? (
            <Pressable
              onPress={onCreate}
              style={[styles.chip, { borderColor: colors.accent, backgroundColor: colors.accent }]}
            >
              <Text style={{ color: colors.accentForeground, fontSize: 13, fontWeight: "600" }}>
                + New
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      ) : null}

      {list.error ? (
        <View style={styles.padded}>
          <ErrorText message={list.error} />
        </View>
      ) : null}

      {list.loading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(item, index) => String(item.id ?? index)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={list.loading && list.items.length > 0}
              onRefresh={list.reload}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={list.loadMore}
          ListEmptyComponent={<EmptyState message="No records found." />}
          ListFooterComponent={
            list.loadingMore ? <ActivityIndicator color={colors.accent} style={styles.footer} /> : null
          }
          renderItem={({ item }) => {
            const [primary, ...rest] = config.columns;
            return (
              <Pressable
                onPress={() => (item.id ? onOpen(Number(item.id)) : undefined)}
                accessibilityRole="button"
              >
                <Card>
                  {primary.render ? (
                    primary.render(item)
                  ) : (
                    <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
                      {formatColumn(getPath(item, primary.key), primary.format)}
                    </Text>
                  )}

                  {rest.map((column) => (
                    <View key={column.label} style={styles.metaRow}>
                      <Text style={[styles.metaLabel, { color: colors.muted }]}>{column.label}</Text>
                      {column.render ? (
                        column.render(item)
                      ) : (
                        <Text style={[styles.metaValue, { color: colors.foreground }]} numberOfLines={1}>
                          {formatColumn(getPath(item, column.key), column.format)}
                        </Text>
                      )}
                    </View>
                  ))}
                </Card>
              </Pressable>
            );
          }}
        />
      )}

      {meta ? (
        <Text style={[styles.count, { color: colors.muted }]}>
          {meta.total} record{meta.total === 1 ? "" : "s"}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  search: {
    marginHorizontal: 20,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  filterGroup: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  padded: {
    paddingHorizontal: 20,
  },
  loader: {
    marginTop: 40,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  footer: {
    paddingVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  metaLabel: {
    fontSize: 13,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
  count: {
    textAlign: "center",
    paddingVertical: 10,
    fontSize: 12,
  },
});
