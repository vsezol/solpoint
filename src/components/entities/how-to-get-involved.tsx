"use client";

import { Card } from "@/components/ui";

interface HowToGetInvolvedProps {
  entityType: "hub" | "community" | "project" | "workspace";
}

export function HowToGetInvolved({ entityType }: HowToGetInvolvedProps) {
  const getEntityName = () => {
    switch (entityType) {
      case "hub":
        return "hub";
      case "community":
        return "community";
      case "project":
        return "project";
      case "workspace":
        return "workspace";
      default:
        return "entity";
    }
  };

  return (
    <Card variant="bordered">
      <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
        How to get involved
      </h2>
      <p className="text-[var(--color-text-secondary)] mb-4">
        Each {getEntityName()} has its own criteria and process. SolPoint helps people connect — organizers decide on membership.
      </p>
      <ul className="space-y-2 text-[var(--color-text-secondary)]">
        <li className="flex items-start gap-2">
          <span className="text-[var(--color-primary)] mt-1">•</span>
          <span>Connect with organizers or existing members</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[var(--color-primary)] mt-1">•</span>
          <span>Attend meetups, workshops, or events</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[var(--color-primary)] mt-1">•</span>
          <span>Contribute to projects or community initiatives</span>
        </li>
      </ul>
    </Card>
  );
}

