"use client";

import { SportsTabs } from "@/components/SportsTabs";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { useSports } from "@/lib/useLookups";
import { ACHIEVEMENT_LEVEL_OPTIONS } from "@/lib/sportsOptions";
import type { SportAchievement } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function SportAchievementsPage() {
  const { items: sports } = useSports();

  return (
    <div className="space-y-6">
      <SportsTabs active="achievements" />
      <MasterList<SportAchievement>
        title="Achievements"
        description="Notable results earned by students and teams."
        endpoint="/v1/sports/achievements"
        searchable={false}
        createHref="/dashboard/sports/achievements/new"
        createPermission="sports.create"
        createLabel="New achievement"
        editHref={(achievement) =>
          `/dashboard/sports/achievements/${achievement.id}/edit`
        }
        filters={[
          {
            param: "sport_id",
            placeholder: "All sports",
            options: sports.map((sport) => ({
              value: String(sport.id),
              label: sport.name,
            })),
          },
          {
            param: "level",
            placeholder: "All levels",
            options: ACHIEVEMENT_LEVEL_OPTIONS,
          },
        ]}
        columns={[
          { header: "Title", render: (achievement) => achievement.title },
          {
            header: "Sport",
            render: (achievement) => achievement.sport?.name ?? "-",
          },
          {
            header: "Student",
            render: (achievement) => achievement.student?.full_name ?? "Team",
          },
          {
            header: "Level",
            render: (achievement) => (
              <Badge value={achievement.level ?? "unknown"} />
            ),
          },
          {
            header: "Position",
            render: (achievement) => achievement.position ?? "-",
          },
          {
            header: "Date",
            render: (achievement) => formatDate(achievement.achieved_on),
          },
        ]}
      />
    </div>
  );
}
