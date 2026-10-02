import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { ErrorText, GhostButton, PrimaryButton } from "../components/ui";
import { ApiError, apiDownload, apiFetch, apiUpload } from "../lib/api";
import { can } from "../lib/nav";
import { useAsync } from "../lib/useAsync";
import { useTheme } from "../theme/ThemeProvider";
import { DateField } from "./fields/DateField";
import { SelectField } from "./fields/SelectField";
import type {
  AdminRecord,
  DetailSection,
  DocumentSectionConfig,
  SelectOption,
} from "./types";

export const DOCUMENT_TYPES: SelectOption[] = [
  { value: "birth_certificate", label: "Birth Certificate" },
  { value: "identity_card", label: "Identity Card" },
  { value: "photo", label: "Photograph" },
  { value: "previous_report", label: "Previous Report Card" },
  { value: "transfer_certificate", label: "Transfer Certificate" },
  { value: "other", label: "Other" },
];

interface DocumentRecord {
  id: number;
  title?: string | null;
  type?: string | null;
  type_label?: string | null;
  original_name?: string | null;
  size?: number | null;
  is_verified?: boolean;
  issued_on?: string | null;
  expires_on?: string | null;
  download_url?: string | null;
}

function formatSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) {
    return "";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uploadPart(
  form: FormData,
  name: string,
  asset: DocumentPicker.DocumentPickerAsset
) {
  const file = asset.file;
  if (Platform.OS === "web" && file) {
    form.append(name, file as unknown as Blob, asset.name);
    return;
  }
  form.append(
    name,
    {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType ?? "application/octet-stream",
    } as unknown as Blob
  );
}

function DocumentUploadModal({
  basePath,
  withValidity,
  campusId,
  onClose,
  onUploaded,
}: {
  basePath: string;
  withValidity?: boolean;
  campusId: number | null;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const { colors } = useTheme();
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [issuedOn, setIssuedOn] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [notes, setNotes] = useState("");
  const [asset, setAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pick = async () => {
    setBanner(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "image/*",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) {
        return;
      }
      setAsset(result.assets[0]);
    } catch {
      setBanner("Unable to open the file picker.");
    }
  };

  const submit = async () => {
    const nextErrors: Record<string, string[]> = {};
    if (!type) {
      nextErrors.type = ["Select a document type."];
    }
    if (!asset) {
      nextErrors.file = ["Choose a file to upload."];
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
      const form = new FormData();
      form.append("type", type);
      if (title.trim()) {
        form.append("title", title.trim());
      }
      if (withValidity && issuedOn.trim()) {
        form.append("issued_on", issuedOn.trim());
      }
      if (withValidity && expiresOn.trim()) {
        form.append("expires_on", expiresOn.trim());
      }
      if (withValidity && notes.trim()) {
        form.append("notes", notes.trim());
      }
      if (asset) {
        uploadPart(form, "file", asset);
      }
      await apiUpload(basePath, form, { campusId });
      onUploaded();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors(caught.errors ?? {});
        setBanner(caught.message);
      } else {
        setBanner("Unable to upload the document.");
      }
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
          <View style={styles.dialogHeader}>
            <Text style={[styles.dialogTitle, { color: colors.foreground }]}>Upload document</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
              <Text style={{ color: colors.muted, fontSize: 18, fontWeight: "700" }}>x</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.dialogBody} contentContainerStyle={styles.dialogBodyContent}>
            {banner ? <ErrorText message={banner} /> : null}
            <SelectField
              label="Type"
              options={DOCUMENT_TYPES}
              value={type}
              onChange={(value) => setType(String(value))}
              error={errors.type?.[0]}
              required
            />
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.muted }]}>Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Optional"
                placeholderTextColor={colors.muted}
                autoCorrect={false}
                style={[
                  styles.input,
                  { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground },
                ]}
              />
            </View>

            {withValidity ? (
              <>
                <DateField label="Issued on" mode="date" value={issuedOn} onChange={(value) => setIssuedOn(String(value ?? ""))} />
                <DateField label="Expires on" mode="date" value={expiresOn} onChange={(value) => setExpiresOn(String(value ?? ""))} />
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.muted }]}>Notes</Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    placeholder="Optional"
                    placeholderTextColor={colors.muted}
                    style={[
                      styles.input,
                      styles.textarea,
                      { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground },
                    ]}
                  />
                </View>
              </>
            ) : null}

            <Pressable
              onPress={() => void pick()}
              accessibilityRole="button"
              style={[styles.fileButton, { borderColor: asset ? colors.accent : colors.border }]}
            >
              <Text style={{ color: asset ? colors.accent : colors.muted, fontSize: 14 }}>
                {asset ? asset.name : "Choose file"}
              </Text>
            </Pressable>
            {errors.file?.[0] ? (
              <Text style={[styles.error, { color: colors.danger }]}>{errors.file[0]}</Text>
            ) : null}
          </ScrollView>

          {saving ? (
            <ActivityIndicator color={colors.accent} style={styles.saving} />
          ) : (
            <PrimaryButton label="Upload" onPress={() => void submit()} />
          )}
          <GhostButton label="Cancel" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function DocumentsList({
  config,
  item,
  permissions,
  campusId,
}: {
  config: DocumentSectionConfig;
  item: AdminRecord;
  permissions: string[];
  campusId: number | null;
}) {
  const { colors } = useTheme();
  const basePath = config.path(item);
  const loader = useCallback(
    () =>
      apiFetch<{ data: DocumentRecord[] }>(basePath, { campusId }).then(
        (response) => response.data
      ),
    [basePath, campusId]
  );
  const { data, loading, error: loadError, reload } = useAsync<DocumentRecord[]>(
    loader,
    [basePath, campusId]
  );
  const docs = data ?? [];
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const canUpload = Boolean(config.uploadPermission) && can(permissions, config.uploadPermission);
  const canDelete = Boolean(config.deletePermission) && can(permissions, config.deletePermission);
  const canVerify = Boolean(config.verifyPermission) && can(permissions, config.verifyPermission);

  const download = async (doc: DocumentRecord) => {
    if (Platform.OS !== "web") {
      if (doc.download_url) {
        await Linking.openURL(doc.download_url);
      }
      return;
    }
    try {
      const blob = await apiDownload(`${basePath}/${doc.id}/download`, { campusId });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = doc.original_name ?? doc.title ?? `document-${doc.id}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Unable to download the document.");
    }
  };

  const verify = async (doc: DocumentRecord) => {
    setBusyId(doc.id);
    setError(null);
    try {
      await apiFetch(`${basePath}/${doc.id}/verify`, { method: "POST", campusId });
      setNotice("Document verified.");
      reload();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to verify the document.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (doc: DocumentRecord) => {
    setBusyId(doc.id);
    setError(null);
    try {
      await apiFetch(`${basePath}/${doc.id}`, { method: "DELETE", campusId });
      setNotice("Document removed.");
      reload();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to remove the document.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View>
      {error ?? loadError ? (
        <ErrorText message={error ?? loadError ?? "Unable to load documents."} />
      ) : null}
      {notice ? (
        <Text style={{ color: colors.accent, fontWeight: "600", fontSize: 13, marginBottom: 6 }}>
          {notice}
        </Text>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ padding: 12 }} />
      ) : docs.length === 0 ? (
        <Text style={[styles.empty, { color: colors.muted }]}>No documents uploaded.</Text>
      ) : (
        <View style={styles.list}>
          {docs.map((doc) => (
            <View
              key={doc.id}
              style={[styles.docRow, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <View style={styles.docInfo}>
                <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 14 }}>
                  {doc.title ?? doc.original_name ?? `Document #${doc.id}`}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {[doc.type_label, formatSize(doc.size), doc.is_verified ? "Verified" : null]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>

              <View style={styles.docActions}>
                <Pressable onPress={() => void download(doc)} accessibilityRole="button" hitSlop={6}>
                  <Text style={{ color: colors.accent, fontSize: 13, fontWeight: "600" }}>Download</Text>
                </Pressable>
                {canVerify && !doc.is_verified ? (
                  <Pressable onPress={() => void verify(doc)} accessibilityRole="button" hitSlop={6}>
                    <Text style={{ color: colors.accent, fontSize: 13, fontWeight: "600" }}>Verify</Text>
                  </Pressable>
                ) : null}
                {canDelete ? (
                  busyId === doc.id ? (
                    <ActivityIndicator color={colors.danger} />
                  ) : (
                    <Pressable onPress={() => void remove(doc)} accessibilityRole="button" hitSlop={6}>
                      <Text style={{ color: colors.danger, fontSize: 13, fontWeight: "600" }}>Delete</Text>
                    </Pressable>
                  )
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}

      {canUpload ? (
        <Pressable
          onPress={() => {
            setNotice(null);
            setUploadOpen(true);
          }}
          accessibilityRole="button"
          style={[styles.uploadButton, { borderColor: colors.accent }]}
        >
          <Text style={{ color: colors.accent, fontWeight: "600", fontSize: 14 }}>
            Upload document
          </Text>
        </Pressable>
      ) : null}

      {uploadOpen ? (
        <DocumentUploadModal
          basePath={basePath}
          withValidity={config.withValidity}
          campusId={campusId}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            setUploadOpen(false);
            setNotice("Document uploaded.");
            reload();
          }}
        />
      ) : null}
    </View>
  );
}

export function documentsSection(config: DocumentSectionConfig): DetailSection {
  return {
    title: config.title,
    render: (item, context) => (
      <DocumentsList
        config={config}
        item={item}
        permissions={context.permissions}
        campusId={context.campusId}
      />
    ),
  };
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
  },
  docRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  docInfo: {
    flexShrink: 1,
    gap: 2,
  },
  docActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  empty: {
    fontSize: 13,
  },
  uploadButton: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
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
  dialogHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  dialogBody: {
    flexGrow: 0,
  },
  dialogBodyContent: {
    paddingBottom: 8,
  },
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
    minHeight: 80,
    textAlignVertical: "top",
  },
  fileButton: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  error: {
    marginTop: 6,
    fontSize: 13,
  },
  saving: {
    marginVertical: 12,
  },
});
