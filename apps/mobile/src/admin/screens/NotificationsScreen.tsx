import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Card,
  EmptyState,
  ErrorText,
  GhostButton,
  PrimaryButton,
  StatusPill,
} from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api";
import { useCampusId } from "../../lib/campus";
import { formatDate } from "../../lib/format";
import { useAsync } from "../../lib/useAsync";
import { useTheme } from "../../theme/ThemeProvider";
import { DateField } from "../fields/DateField";
import { LookupField } from "../fields/LookupField";

interface Notification {
  id: number;
  type_label?: string | null;
  channel_label?: string | null;
  student?: string | null;
  guardian?: string | null;
  recipient_name?: string | null;
  recipient_email?: string | null;
  recipient_phone?: string | null;
  title?: string | null;
  status?: string | null;
  status_label?: string | null;
  created_at?: string | null;
}

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "cancelled", label: "Cancelled" },
];

export function NotificationsScreen({ permissions }: { permissions: string[] }) {
  const { colors } = useTheme();
  const campusId = useCampusId();
  const canSend = permissions.includes("notification.send");
  const canCreate = permissions.includes("notification.create");

  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showQueue, setShowQueue] = useState(false);
  const [queueDate, setQueueDate] = useState<unknown>("");
  const [queueClass, setQueueClass] = useState<unknown>("");

  const loader = useCallback(async () => {
    const params = new URLSearchParams({ per_page: "50" });
    if (status) {
      params.set("status", status);
    }
    const response = await apiFetch<{ data: Notification[] }>(
      `/v1/notifications?${params.toString()}`,
      { campusId }
    );
    return response.data;
  }, [status, campusId]);

  const { data, loading, error: loadError, reload } = useAsync<Notification[]>(loader, [
    status,
    campusId,
  ]);
  const rows = data ?? [];

  const act = useCallback(
    async (path: string, success: string, body?: Record<string, unknown>) => {
      setError(null);
      setNotice(null);
      try {
        await apiFetch(path, { method: "POST", body, campusId });
        setNotice(success);
        reload();
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : "Action failed.");
      }
    },
    [campusId, reload]
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {error ?? loadError ? <ErrorText message={(error ?? loadError) as string} /> : null}
      {notice ? <Text style={{ color: colors.accent, fontWeight: "600", marginBottom: 8 }}>{notice}</Text> : null}

      <View style={styles.chips}>
        {STATUS_FILTERS.map((filter) => {
          const isActive = filter.value === status;
          return (
            <Text
              key={filter.value || "all"}
              onPress={() => setStatus(filter.value)}
              style={[
                styles.chip,
                {
                  color: isActive ? colors.accent : colors.muted,
                  borderColor: isActive ? colors.accent : colors.border,
                  backgroundColor: isActive ? colors.accentSoft : colors.surface,
                },
              ]}
            >
              {filter.label}
            </Text>
          );
        })}
      </View>

      {canSend ? (
        <PrimaryButton
          label="Send all pending"
          onPress={() => void act("/v1/notifications/send", "Pending notifications sent.")}
        />
      ) : null}

      {canCreate ? (
        <>
          <GhostButton
            label={showQueue ? "Hide absence queue" : "Queue absence notices"}
            onPress={() => setShowQueue((previous) => !previous)}
          />
          {showQueue ? (
            <Card>
              <DateField label="Attendance date" mode="date" value={queueDate} onChange={setQueueDate} />
              <LookupField label="Class" lookup="classRooms" value={queueClass} onChange={setQueueClass} />
              <PrimaryButton
                label="Queue"
                onPress={() => {
                  if (!queueDate) {
                    setError("Select an attendance date.");
                    return;
                  }
                  const body: Record<string, unknown> = { attendance_date: String(queueDate) };
                  if (queueClass) {
                    body.class_room_id = queueClass;
                  }
                  void act("/v1/notifications/queue-absences", "Absence notices queued.", body);
                }}
              />
            </Card>
          ) : null}
        </>
      ) : null}

      {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} /> : null}

      {!loading && rows.length === 0 ? <EmptyState message="No notifications." /> : null}

      {rows.map((row) => (
        <Card key={row.id}>
          <View style={styles.rowHead}>
            <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 14, flex: 1 }}>
              {row.title ?? `Notification #${row.id}`}
            </Text>
            <StatusPill value={row.status} label={row.status_label ?? row.status} />
          </View>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
            {[row.type_label, row.channel_label, row.student, row.guardian, row.recipient_name]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
            {formatDate(row.created_at)}
          </Text>
          {canSend && row.status === "pending" ? (
            <View style={styles.actions}>
              <GhostButton
                label="Send"
                onPress={() => void act(`/v1/notifications/${row.id}/send`, "Notification sent.")}
              />
              <GhostButton
                label="Cancel"
                tone="danger"
                onPress={() => void act(`/v1/notifications/${row.id}/cancel`, "Notification cancelled.")}
              />
            </View>
          ) : null}
        </Card>
      ))}
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
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: "600",
    overflow: "hidden",
  },
  rowHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
});
