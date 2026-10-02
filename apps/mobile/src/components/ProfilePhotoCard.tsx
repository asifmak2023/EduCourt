import { useState } from "react";
import { useTranslation } from "@eis/i18n";
import { Alert, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ApiError, apiFetch, apiUpload } from "../lib/api";
import { Avatar } from "./Avatar";
import { Card, ErrorText, GhostButton, PrimaryButton, SectionLabel } from "./ui";
import { useTheme } from "../theme/ThemeProvider";

export function ProfilePhotoCard({
  endpoint,
  name,
  photoUrl,
  onChanged,
  canManage,
  hint,
}: {
  endpoint: string;
  name: string;
  photoUrl: string | null;
  onChanged: (photoUrl: string | null) => void;
  canManage: boolean;
  hint?: string;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickAndUpload() {
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t("profile.photoPermission"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];

    const formData = new FormData();
    formData.append("photo", {
      uri: asset.uri,
      name: asset.fileName ?? "photo.jpg",
      type: asset.mimeType ?? "image/jpeg",
    } as unknown as Blob);

    setBusy(true);

    try {
      const response = await apiUpload<{ data: { photo_url?: string | null } }>(
        endpoint,
        formData
      );
      onChanged(response.data.photo_url ?? null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("profile.uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setError(null);
    setBusy(true);

    try {
      await apiFetch(endpoint, { method: "DELETE" });
      onChanged(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("profile.removeFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionLabel>{t("profile.photoTitle")}</SectionLabel>

      <View style={styles.row}>
        <Avatar name={name} photoUrl={photoUrl} size="lg" />

        {canManage ? (
          <View style={styles.actions}>
            <PrimaryButton
              label={photoUrl ? t("profile.replacePhoto") : t("profile.uploadPhoto")}
              onPress={() => void pickAndUpload()}
              loading={busy}
            />
            {photoUrl ? (
              <GhostButton
                label={t("common.remove")}
                tone="danger"
                disabled={busy}
                onPress={() => {
                  Alert.alert(
                    t("profile.removePhotoTitle"),
                    t("profile.removePhotoMessage"),
                    [
                      { text: t("common.cancel"), style: "cancel" },
                      {
                        text: t("common.remove"),
                        style: "destructive",
                        onPress: () => void remove(),
                      },
                    ]
                  );
                }}
              />
            ) : null}
          </View>
        ) : (
          <Text style={{ color: colors.muted, flex: 1, fontSize: 13 }}>
            {hint ?? t("profile.contactAdmin")}
          </Text>
        )}
      </View>

      {canManage && hint ? (
        <Text style={[styles.hint, { color: colors.muted }]}>{hint}</Text>
      ) : null}

      {error ? <ErrorText message={error} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  actions: {
    flex: 1,
  },
  hint: {
    marginTop: 10,
    fontSize: 12,
  },
});
