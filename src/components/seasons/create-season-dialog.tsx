"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type SeasonType = "Winter" | "Summer" | "Fall";

interface CreateSeasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    type: SeasonType;
    year: number;
    setActive: boolean;
  }) => Promise<void>;
}

export function CreateSeasonDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateSeasonDialogProps) {
  const currentYear = new Date().getFullYear();
  const [type, setType] = useState<SeasonType>("Fall");
  const [year, setYear] = useState<number>(currentYear);
  const [setActive, setSetActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate year options (current year - 1 to current year + 2)
  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - 1 + i);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ type, year, setActive });
      onOpenChange(false);
      // Reset form
      setType("Fall");
      setYear(currentYear);
      setSetActive(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Season</DialogTitle>
            <DialogDescription>
              Add a new season to organize games.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Season
              </Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as SeasonType)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select season type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Winter">Winter (Jan-Apr)</SelectItem>
                  <SelectItem value="Summer">Summer (May-Aug)</SelectItem>
                  <SelectItem value="Fall">Fall (Sep-Dec)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="year" className="text-right">
                Year
              </Label>
              <Select
                value={year.toString()}
                onValueChange={(v) => setYear(parseInt(v, 10))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-span-1" />
              <div className="col-span-3 flex items-center space-x-2">
                <Checkbox
                  id="setActive"
                  checked={setActive}
                  onCheckedChange={(checked) => setSetActive(checked === true)}
                />
                <Label
                  htmlFor="setActive"
                  className="text-sm font-normal cursor-pointer"
                >
                  Set as current season
                </Label>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-span-1" />
              <p className="col-span-3 text-sm text-muted-foreground">
                {type} {year}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Season"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
