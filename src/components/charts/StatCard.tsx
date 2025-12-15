import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  color?: "default" | "success" | "warning" | "danger" | "info";
  format?: "number" | "percentage" | "decimal";
  className?: string;
}

const colorClasses = {
  default: "bg-card",
  success: "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
  warning: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800",
  danger: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
  info: "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800",
};

const valueColorClasses = {
  default: "text-foreground",
  success: "text-green-700 dark:text-green-400",
  warning: "text-yellow-700 dark:text-yellow-400",
  danger: "text-red-700 dark:text-red-400",
  info: "text-blue-700 dark:text-blue-400",
};

const trendColors = {
  up: "text-green-600 dark:text-green-400",
  down: "text-red-600 dark:text-red-400",
  neutral: "text-gray-500 dark:text-gray-400",
};

const TrendIcon = ({ direction }: { direction: "up" | "down" | "neutral" }) => {
  switch (direction) {
    case "up":
      return <TrendingUp className="h-4 w-4" />;
    case "down":
      return <TrendingDown className="h-4 w-4" />;
    default:
      return <Minus className="h-4 w-4" />;
  }
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "default",
  format = "number",
  className,
}: StatCardProps) {
  const formatValue = (val: number | string): string => {
    if (typeof val === "string") return val;
    switch (format) {
      case "percentage":
        return `${val.toFixed(1)}%`;
      case "decimal":
        return val.toFixed(2);
      default:
        return val.toLocaleString();
    }
  };

  return (
    <Card className={cn(colorClasses[color], "transition-all hover:shadow-md", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn("text-3xl font-bold mt-2", valueColorClasses[color])}>
              {formatValue(value)}
            </p>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className={cn("flex items-center gap-1 mt-2", trendColors[trend.direction])}>
                <TrendIcon direction={trend.direction} />
                <span className="text-sm font-medium">
                  {trend.value > 0 ? "+" : ""}
                  {trend.value.toFixed(1)}%
                </span>
                {trend.label && (
                  <span className="text-xs text-muted-foreground ml-1">{trend.label}</span>
                )}
              </div>
            )}
          </div>
          {icon && (
            <div className="p-3 bg-primary/10 rounded-lg">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatCardGrid({ children, columns = 4 }: { children: React.ReactNode; columns?: 2 | 3 | 4 | 5 }) {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 md:grid-cols-2 lg:grid-cols-5",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns])}>
      {children}
    </div>
  );
}
