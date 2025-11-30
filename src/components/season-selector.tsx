"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Id } from "@/convex/_generated/dataModel";

export type Season = {
  _id: Id<"seasons">;
  _creationTime: number;
  name: string;
  type: "Winter" | "Summer" | "Fall";
  year: number;
  startDate: number;
  endDate: number;
  isActive: boolean;
  createdAt: number;
};

interface SeasonSelectorProps {
  seasons: Season[] | undefined;
  selectedSeasonId: Id<"seasons"> | null;
  onSeasonChange: (seasonId: Id<"seasons"> | null) => void;
  showAllOption?: boolean;
  className?: string;
}

export function SeasonSelector({
  seasons,
  selectedSeasonId,
  onSeasonChange,
  showAllOption = false,
  className,
}: SeasonSelectorProps) {
  if (!seasons || seasons.length === 0) {
    return null;
  }

  const handleValueChange = (value: string) => {
    if (value === "all") {
      onSeasonChange(null);
    } else {
      onSeasonChange(value as Id<"seasons">);
    }
  };

  // Find the active season to show as default placeholder
  const activeSeason = seasons.find((s) => s.isActive);
  const selectedSeason = selectedSeasonId
    ? seasons.find((s) => s._id === selectedSeasonId)
    : null;

  return (
    <Select
      value={selectedSeasonId ?? (showAllOption ? "all" : undefined)}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className={className ?? "w-[180px]"}>
        <SelectValue placeholder={activeSeason?.name ?? "Select season"} />
      </SelectTrigger>
      <SelectContent>
        {showAllOption && <SelectItem value="all">All Seasons</SelectItem>}
        {seasons.map((season) => (
          <SelectItem key={season._id} value={season._id}>
            {season.name}
            {season.isActive && " (Current)"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
