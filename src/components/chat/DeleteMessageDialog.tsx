"use client";

import { Id } from "@/convex/_generated/dataModel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type DeleteMessageDialogProps = {
  deleteConfirmId: Id<"messages"> | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DeleteMessageDialog({
  deleteConfirmId,
  onOpenChange,
  onConfirm,
}: DeleteMessageDialogProps) {
  return (
    <>
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The message will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
