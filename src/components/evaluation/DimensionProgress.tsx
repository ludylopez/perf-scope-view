import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DimensionProgressProps {
  answered: number;
  total: number;
  className?: string;
}

export const DimensionProgress = ({
  answered,
  total,
  className,
}: DimensionProgressProps) => {
  const isComplete = answered === total;
  const percentage = Math.round((answered / total) * 100);

  return (
    <Badge
      variant={isComplete ? "default" : "outline"}
      className={cn(
        "flex items-center gap-1 font-normal",
        isComplete ? "bg-success text-success-foreground" : "text-muted-foreground",
        className
      )}
    >
      {isComplete && <CheckCircle2 className="h-3 w-3" />}
      {answered}/{total}
      {!isComplete && ` (${percentage}%)`}
    </Badge>
  );
};
