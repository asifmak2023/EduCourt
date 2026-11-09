import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EduCourt Family",
    short_name: "Family",
    description:
      "Attendance, results, fees and timetable for parents and students.",
    start_url: "/portal",
    display: "standalone",
    background_color: "#f7f8fc",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
