import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutoSaveIndicatorProps {
  status: "idle" | "saving" | "saved";
  className?: string;
}

export const AutoSaveIndicator = ({
  status,
  className,
}: AutoSaveIndicatorProps) => {
  if (status === "idle") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm transition-all",
        status === "saving" && "text-muted-foreground",
        status === "saved" && "text-success",
        className
      )}
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Guardando...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="h-3 w-3" />
          <span>Guardado</span>
        </>
      )}
    </div>
  );
};
