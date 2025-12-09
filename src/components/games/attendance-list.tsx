"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getInitials } from "./roster-drawer";
import type { PlayerWithStatus } from "./lines-editor";

interface AttendanceListProps {
  players: PlayerWithStatus[];
}

export function AttendanceList({ players }: AttendanceListProps) {
  const going = players.filter((p) => p.status === "in");
  const maybe = players.filter((p) => p.status === "pending");
  const out = players.filter((p) => p.status === "out");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider pl-1">
          Going ({going.length})
        </h3>
        {going.length === 0 && (
          <div className="text-sm text-muted-foreground italic pl-1">
            No one going yet
          </div>
        )}
        {going.map((p) => (
          <div
            key={p._id}
            className="flex items-center justify-between p-3 bg-card border rounded-xl shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {getInitials(p.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-bold text-sm">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  #{p.number} • {p.position || "Player"}
                </div>
              </div>
            </div>
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
            >
              In
            </Badge>
          </div>
        ))}
      </div>

      {maybe.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider pl-1">
            Maybe ({maybe.length})
          </h3>
          {maybe.map((p) => (
            <div
              key={p._id}
              className="flex items-center justify-between p-3 bg-card/50 border border-dashed rounded-xl"
            >
              <div className="flex items-center gap-3 opacity-70">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{getInitials(p.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    #{p.number || "-"}
                  </div>
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-orange-600 border-orange-200 bg-orange-50"
              >
                Maybe
              </Badge>
            </div>
          ))}
        </div>
      )}

      {out.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider pl-1">
            Out ({out.length})
          </h3>
          {out.map((p) => (
            <div
              key={p._id}
              className="flex items-center justify-between p-3 bg-card/30 border border-transparent rounded-xl opacity-60"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 grayscale">
                  <AvatarFallback>{getInitials(p.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold text-sm line-through decoration-muted-foreground/50">
                    {p.name}
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-muted-foreground">
                Out
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
