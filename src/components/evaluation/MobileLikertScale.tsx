import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface MobileLikertScaleProps {
  itemId: string;
  itemText: string;
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const LIKERT_OPTIONS = [
  { value: 1, label: "Muy bajo" },
  { value: 2, label: "Bajo" },
  { value: 3, label: "Medio" },
  { value: 4, label: "Alto" },
  { value: 5, label: "Muy alto" },
];

export const MobileLikertScale = ({
  itemId,
  itemText,
  value,
  onChange,
  disabled = false,
}: MobileLikertScaleProps) => {
  return (
    <div id={`likert-${itemId}`} className="space-y-4 rounded-lg border-2 bg-card p-4 sm:p-6 transition-all">
      <p className="text-base font-medium leading-relaxed text-foreground">
        {itemText}
      </p>
      
      <RadioGroup
        value={value?.toString()}
        onValueChange={(v) => onChange(parseInt(v))}
        disabled={disabled}
        className="space-y-3"
      >
        {LIKERT_OPTIONS.map((option) => (
          <label
            key={option.value}
            htmlFor={`${itemId}-${option.value}`}
            className={cn(
              "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
              "hover:shadow-sm hover:border-muted-foreground/30",
              value === option.value
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card"
            )}
          >
            <RadioGroupItem
              value={option.value.toString()}
              id={`${itemId}-${option.value}`}
              className="h-6 w-6 shrink-0"
            />
            <div className="flex-1 flex items-center justify-between">
              <span className="font-medium text-base">
                {option.label}
              </span>
              <span className={cn(
                "text-2xl font-bold",
                value === option.value ? "text-primary" : "text-muted-foreground"
              )}>
                {option.value}
              </span>
            </div>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
};
