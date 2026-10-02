import { useState } from "react";
import { useTranslation } from "@eis/i18n";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SectionLabel } from "../../components/ui";
import { useTr } from "../../lib/i18n";
import { useTheme } from "../../theme/ThemeProvider";
import { ApiError, apiFetch, apiUpload } from "../../lib/api";
import { getPath } from "../display";
import type { AdminRecord, PhotoFieldConfig } from "../types";

export function PhotoField({
  field,
  item,
  canEdit,
  campusId,
  onChanged,
}: {
  field: PhotoFieldConfig;
  item: AdminRecord;
  canEdit: boolean;
  campusId: number | null;
  onChanged: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const tr = useTr();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urlKey = field.urlKey ?? "photo_url";
  const raw = getPath(item, urlKey);
  const url = raw ? String(raw) : null;
  const path = field.path.replace("{id}", String(item.id));

  const pick = async () => {
    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(t("admin.photo.permission"));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const form = new FormData();
      if (asset.file) {
        form.append(field.fileField ?? "photo", asset.file);
      } else {
        form.append(
          field.fileField ?? "photo",
          {
            uri: asset.uri,
            name: asset.fileName ?? "photo.jpg",
            type: asset.mimeType ?? "image/jpeg",
          } as unknown as Blob
        );
      }

      setBusy(true);
      await apiUpload(path, form, { campusId });
      onChanged();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : t("admin.photo.uploadFailed")
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setError(null);
    setBusy(true);
    try {
      await apiFetch(path, { method: "DELETE", campusId });
      onChanged();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : t("admin.photo.removeFailed")
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <SectionLabel>{tr(field.label)}</SectionLabel>
      <View style={styles.row}>
        {url ? (
          <Image source={{ uri: url }} style={[styles.image, { borderColor: colors.border }]} />
        ) : (
          <View
            style={[
              styles.image,
              styles.placeholder,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <Text style={{ color: colors.muted, fontSize: 12 }}>{t("admin.photo.none")}</Text>
          </View>
        )}

        {canEdit ? (
          <View style={styles.actions}>
            {busy ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <>
                <Pressable
                  onPress={() => void pick()}
                  accessibilityRole="button"
                  style={[styles.button, { borderColor: colors.accent }]}
                >
                  <Text style={{ color: colors.accent, fontWeight: "600", fontSize: 13 }}>
                    {t("admin.photo.change")}
                  </Text>
                </Pressable>
                {url ? (
                  <Pressable
                    onPress={() => void remove()}
                    accessibilityRole="button"
                    style={[styles.button, { borderColor: colors.danger }]}
                  >
                    <Text style={{ color: colors.danger, fontWeight: "600", fontSize: 13 }}>
                      {t("common.remove")}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 8,
  },
  image: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    gap: 8,
  },
  button: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  error: {
    marginTop: 8,
    fontSize: 13,
  },
});
