"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Season } from "@/app/(dashboard)/games/actions";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateSeasonDialog } from "@/components/seasons/create-season-dialog";
import { CheckCircle2 } from "lucide-react";

function formatDateRange(startDate: number, endDate: number): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  return `${start.toLocaleDateString(
    "en-US",
    options
  )} - ${end.toLocaleDateString("en-US", options)}`;
}

export function SeasonsClient() {
  const seasons = useQuery(api.seasons.list, {});
  const me = useQuery(api.me.get);
  const createSeason = useMutation(api.seasons.create);
  const setActiveSeason = useMutation(api.seasons.setActive);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const isAdmin = me?.role === "admin";

  const handleCreateSeason = async (data: {
    type: "Winter" | "Summer" | "Fall";
    year: number;
    setActive: boolean;
  }) => {
    try {
      await createSeason({
        type: data.type,
        year: data.year,
        setActive: data.setActive,
      });
      toast.success(`${data.type} ${data.year} season created`);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to create season";
      toast.error(message);
      throw e;
    }
  };

  const handleSetActive = async (seasonId: Id<"seasons">) => {
    try {
      await setActiveSeason({ id: seasonId });
      toast.success("Current season updated");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to update season";
      toast.error(message);
    }
  };

  if (!seasons) {
    return (
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Loading seasons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Seasons</h1>
          <p className="text-muted-foreground">
            Manage hockey seasons and view standings
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            Add Season
          </Button>
        )}
      </div>

      {seasons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No seasons yet</p>
            {isAdmin && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Create First Season
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Seasons</CardTitle>
            <CardDescription>
              Click on a season to view games and stats
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Season</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {seasons.map((season: Season) => (
                  <TableRow key={season._id}>
                    <TableCell className="font-medium">{season.name}</TableCell>
                    <TableCell>
                      {formatDateRange(season.startDate, season.endDate)},{" "}
                      {season.year}
                    </TableCell>
                    <TableCell>
                      {season.isActive ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Current
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Past</Badge>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {!season.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetActive(season._id)}
                          >
                            Set as Current
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <CreateSeasonDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateSeason}
      />
    </div>
  );
}
