import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface LikertScaleProps {
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

export const LikertScale = ({
  itemId,
  itemText,
  value,
  onChange,
  disabled = false,
}: LikertScaleProps) => {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <p className="text-sm font-medium leading-relaxed text-foreground">
        {itemText}
      </p>
      
      <RadioGroup
        value={value?.toString()}
        onValueChange={(v) => onChange(parseInt(v))}
        disabled={disabled}
        className="grid grid-cols-5 gap-2"
      >
        {LIKERT_OPTIONS.map((option) => (
          <div key={option.value} className="flex flex-col items-center gap-2">
            <RadioGroupItem
              value={option.value.toString()}
              id={`${itemId}-${option.value}`}
              className="h-6 w-6"
            />
            <Label
              htmlFor={`${itemId}-${option.value}`}
              className="cursor-pointer text-center text-xs leading-tight"
            >
              <span className="font-bold">{option.value}</span>
              <br />
              <span className="text-muted-foreground">{option.label}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};
