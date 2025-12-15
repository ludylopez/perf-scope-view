import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GaugeSegment {
  from: number;
  to: number;
  color: string;
  label: string;
}

interface GaugeChartProps {
  value: number;
  min?: number;
  max?: number;
  title: string;
  subtitle?: string;
  segments?: GaugeSegment[];
  showValue?: boolean;
  valueFormat?: "number" | "percentage" | "decimal";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const defaultSegments: GaugeSegment[] = [
  { from: 0, to: 40, color: "#ef4444", label: "Bajo" },
  { from: 40, to: 60, color: "#f97316", label: "Regular" },
  { from: 60, to: 75, color: "#eab308", label: "Satisfactorio" },
  { from: 75, to: 90, color: "#84cc16", label: "Bueno" },
  { from: 90, to: 100, color: "#22c55e", label: "Excelente" },
];

const sizeConfig = {
  sm: { height: 180, innerRadius: 50, outerRadius: 70, fontSize: "text-2xl" },
  md: { height: 240, innerRadius: 70, outerRadius: 95, fontSize: "text-3xl" },
  lg: { height: 300, innerRadius: 90, outerRadius: 120, fontSize: "text-4xl" },
};

export function GaugeChart({
  value,
  min = 0,
  max = 100,
  title,
  subtitle,
  segments = defaultSegments,
  showValue = true,
  valueFormat = "percentage",
  size = "md",
  className,
}: GaugeChartProps) {
  const config = sizeConfig[size];
  const normalizedValue = Math.max(min, Math.min(max, value));
  const percentage = ((normalizedValue - min) / (max - min)) * 100;

  // Crear datos para el semicirculo
  const gaugeData = segments.map((segment) => ({
    name: segment.label,
    value: segment.to - segment.from,
    color: segment.color,
    from: segment.from,
    to: segment.to,
  }));

  // Encontrar el segmento actual para el color del valor
  const currentSegment = segments.find(
    (seg) => percentage >= seg.from && percentage <= seg.to
  ) || segments[segments.length - 1];

  const formatValue = (val: number): string => {
    switch (valueFormat) {
      case "percentage":
        return `${val.toFixed(1)}%`;
      case "decimal":
        return val.toFixed(2);
      default:
        return val.toLocaleString();
    }
  };

  // Calcular la rotacion de la aguja
  const needleAngle = -90 + (percentage * 180) / 100;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent className="pb-4">
        <div className="relative" style={{ height: config.height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={gaugeData}
                cx="50%"
                cy="65%"
                startAngle={180}
                endAngle={0}
                innerRadius={config.innerRadius}
                outerRadius={config.outerRadius}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
              >
                {gaugeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Aguja indicadora */}
          <div
            className="absolute left-1/2 origin-bottom"
            style={{
              width: "4px",
              height: config.innerRadius - 10,
              marginLeft: "-2px",
              bottom: "35%",
              transform: `rotate(${needleAngle}deg)`,
              transition: "transform 0.5s ease-out",
            }}
          >
            <div
              className="w-full h-full rounded-full"
              style={{ backgroundColor: currentSegment.color }}
            />
          </div>

          {/* Centro */}
          <div
            className="absolute left-1/2 rounded-full bg-background border-4"
            style={{
              width: "20px",
              height: "20px",
              marginLeft: "-10px",
              bottom: "35%",
              marginBottom: "-10px",
              borderColor: currentSegment.color,
            }}
          />

          {/* Valor - posicionado debajo del gauge */}
          {showValue && (
            <div
              className="absolute inset-x-0 text-center bg-background/90 pt-2"
              style={{ bottom: "-10px" }}
            >
              <span className={cn("font-bold", config.fontSize)} style={{ color: currentSegment.color }}>
                {formatValue(normalizedValue)}
              </span>
              <p className="text-sm text-muted-foreground">{currentSegment.label}</p>
            </div>
          )}
        </div>

        {/* Leyenda de segmentos */}
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-muted-foreground">
                {segment.label} ({segment.from}-{segment.to}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Variante compacta sin card
export function GaugeMini({
  value,
  min = 0,
  max = 100,
  label,
  segments = defaultSegments,
}: {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  segments?: GaugeSegment[];
}) {
  const percentage = ((Math.max(min, Math.min(max, value)) - min) / (max - min)) * 100;
  const currentSegment = segments.find(
    (seg) => percentage >= seg.from && percentage <= seg.to
  ) || segments[segments.length - 1];

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-12 h-6 rounded-t-full overflow-hidden relative"
        style={{ background: `conic-gradient(from 180deg, ${segments.map(s => `${s.color} ${s.from}% ${s.to}%`).join(', ')})` }}
      >
        <div
          className="absolute bottom-0 left-1/2 w-1 h-4 origin-bottom bg-foreground rounded-full"
          style={{
            marginLeft: "-2px",
            transform: `rotate(${-90 + percentage * 1.8}deg)`,
          }}
        />
      </div>
      <div>
        <span className="font-semibold" style={{ color: currentSegment.color }}>
          {value.toFixed(1)}%
        </span>
        {label && <p className="text-xs text-muted-foreground">{label}</p>}
      </div>
    </div>
  );
}
