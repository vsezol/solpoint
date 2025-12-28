"use client";

import { Card } from "@/components/ui";

interface ActivitySectionProps {
  activities?: string[]; // Опциональный список активностей
}

const DEFAULT_ACTIVITIES = ["Meetups", "Networking", "Workshops", "Hackathons"];

export function ActivitySection({ activities = DEFAULT_ACTIVITIES }: ActivitySectionProps) {
  return (
    <Card variant="bordered">
      <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
        Activity
      </h2>
      <div className="flex flex-wrap gap-2">
        {activities.map((activity) => (
          <span
            key={activity}
            className="px-3 py-1.5 rounded-full bg-green-500/20 text-green-500 text-sm font-medium"
          >
            {activity}
          </span>
        ))}
      </div>
    </Card>
  );
}

