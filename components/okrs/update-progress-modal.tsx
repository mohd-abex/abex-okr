"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export type KRForModal = {
  id: string;
  title: string;
  current_value: number;
  target_value?: number;
  units?: string | null;
};

export default function UpdateProgressModal({
  open,
  onOpenChange,
  kr,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kr: KRForModal | null;
  onSubmit: (newValue: number) => Promise<void>;
}) {
  const [value, setValue] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (kr) {
      setValue(String(kr.current_value ?? ""));
      setError(null);
    } else {
      setValue("");
      setError(null);
    }
  }, [kr, open]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    setError(null);
    const parsed = Number(value);
    if (value.trim() === "" || Number.isNaN(parsed) || parsed < 0) {
      setError("Please enter a valid non-negative number");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(parsed);
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message ?? "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Progress</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm">Key Result</Label>
            <div className="mt-1 text-sm font-medium">
              {kr ? kr.title : "—"}
            </div>
          </div>

          <div>
            <Label htmlFor="kr-value">Current Value</Label>
            <Input
              id="kr-value"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-2"
              min={0}
            />
            {kr?.target_value !== undefined && (
              <div className="text-xs text-muted-foreground mt-1">
                Target: {kr.target_value} {kr.units ?? ""}
              </div>
            )}
            {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
          </div>

          <DialogFooter>
            <div className="flex justify-end gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
