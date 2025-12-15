import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TreemapNode } from "@/types/analisis";

interface TreemapChartProps {
  data: TreemapNode[];
  title?: string;
  description?: string;
  colorField?: string;
  showLabels?: boolean;
  height?: number;
  colors?: string[];
  className?: string;
}

const defaultColors = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f43f5e", "#14b8a6",
  "#6366f1", "#10b981", "#f97316", "#dc2626", "#7c3aed",
];

// Componente personalizado para contenido del Treemap
const CustomContent = ({
  root,
  depth,
  x,
  y,
  width,
  height,
  index,
  name,
  value,
  colors,
  showLabels,
}: any) => {
  // Validar que name y value existan
  if (!name || value === undefined || value === null) {
    return null;
  }

  const color = colors[index % colors.length];
  const minSize = 40;
  const showText = showLabels && width > minSize && height > minSize;
  const showValue = showLabels && width > 60 && height > 50;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: color,
          stroke: "#fff",
          strokeWidth: 2,
          strokeOpacity: 1,
        }}
        rx={4}
        ry={4}
      />
      {showText && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - (showValue ? 8 : 0)}
            textAnchor="middle"
            fill="#fff"
            fontSize={width > 80 ? 12 : 10}
            fontWeight="500"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
          >
            {name && name.length > 15 ? name.substring(0, 15) + "..." : (name || "")}
          </text>
          {showValue && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 12}
              textAnchor="middle"
              fill="#fff"
              fontSize={10}
              opacity={0.9}
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
            >
              {value.toLocaleString()}
            </text>
          )}
        </>
      )}
    </g>
  );
};

export function TreemapChart({
  data,
  title,
  description,
  showLabels = true,
  height = 400,
  colors = defaultColors,
  className,
}: TreemapChartProps) {
  // Validar y filtrar datos inválidos
  const validData = data.filter(item => item && item.name && item.value !== undefined && item.value !== null);
  
  if (validData.length === 0) {
    return (
      <Card className={className}>
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            No hay datos disponibles para mostrar
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transformar datos para Recharts
  const treemapData = validData.map((item, index) => ({
    name: item.name || `Item ${index + 1}`,
    size: item.value || 0,
    color: item.color || colors[index % colors.length],
    children: item.children?.filter(child => child && child.name && child.value !== undefined)
      .map((child, childIndex) => ({
        name: child.name || `Sub-item ${childIndex + 1}`,
        size: child.value || 0,
        color: child.color || colors[(index + childIndex + 1) % colors.length],
      })),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const percentage = ((d.size / total) * 100).toFixed(1);

    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold">{d.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: d.color }}
          />
          <span className="text-muted-foreground">Cantidad:</span>
          <span className="font-mono font-medium">{d.size.toLocaleString()}</span>
        </div>
        <p className="text-muted-foreground mt-1">
          <span className="font-mono">{percentage}%</span> del total
        </p>
      </div>
    );
  };

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={treemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#fff"
              fill="#8884d8"
              content={
                <CustomContent colors={colors} showLabels={showLabels} />
              }
            >
              <Tooltip content={<CustomTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        </div>

        {/* Leyenda */}
        <div className="mt-4 flex flex-wrap gap-3 justify-center">
          {validData.slice(0, 10).map((item, index) => (
            <div key={item.name || `item-${index}`} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: item.color || colors[index % colors.length] }}
              />
              <span className="text-muted-foreground">{item.name || `Item ${index + 1}`}</span>
              <span className="font-mono text-foreground">({item.value || 0})</span>
            </div>
          ))}
          {validData.length > 10 && (
            <span className="text-xs text-muted-foreground">+{validData.length - 10} más</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Versión para mostrar distribución organizacional por nivel/dirección
export function OrganizationalTreemap({
  data,
  groupBy,
  title,
  description,
  height = 400,
  className,
}: {
  data: Array<{
    nombre: string;
    cantidad: number;
    subgrupos?: Array<{ nombre: string; cantidad: number }>;
  }>;
  groupBy?: "nivel" | "direccion" | "area";
  title?: string;
  description?: string;
  height?: number;
  className?: string;
}) {
  const treemapData: TreemapNode[] = data.map((item) => ({
    name: item.nombre,
    value: item.cantidad,
    children: item.subgrupos?.map((sub) => ({
      name: sub.nombre,
      value: sub.cantidad,
    })),
  }));

  const defaultTitle = groupBy
    ? `Distribución por ${groupBy === "nivel" ? "Nivel" : groupBy === "direccion" ? "Dirección" : "Área"}`
    : "Distribución Organizacional";

  return (
    <TreemapChart
      data={treemapData}
      title={title || defaultTitle}
      description={description}
      height={height}
      className={className}
    />
  );
}

// Versión para temas de capacitación
export function CapacitacionTreemap({
  temas,
  title = "Temas de Capacitación por Frecuencia",
  description,
  height = 400,
  className,
}: {
  temas: Array<{
    nombre: string;
    frecuencia: number;
    categoria?: string;
    prioridad?: "alta" | "media" | "baja";
  }>;
  title?: string;
  description?: string;
  height?: number;
  className?: string;
}) {
  const prioridadColors = {
    alta: "#ef4444",
    media: "#f59e0b",
    baja: "#22c55e",
  };

  const treemapData: TreemapNode[] = temas.map((tema) => ({
    name: tema.nombre,
    value: tema.frecuencia,
    color: tema.prioridad ? prioridadColors[tema.prioridad] : undefined,
  }));

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={treemapData.map((d, i) => ({
                name: d.name,
                size: d.value,
                color: d.color || defaultColors[i % defaultColors.length],
              }))}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#fff"
              content={
                <CustomContent colors={defaultColors} showLabels={true} />
              }
            >
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  const tema = temas.find((t) => t.nombre === d.name);

                  return (
                    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-semibold">{d.name}</p>
                      <p className="text-muted-foreground mt-1">
                        Frecuencia: <span className="font-mono font-medium">{d.size}</span>
                      </p>
                      {tema?.categoria && (
                        <p className="text-muted-foreground">
                          Categoría: <span className="font-medium">{tema.categoria}</span>
                        </p>
                      )}
                      {tema?.prioridad && (
                        <p
                          className="capitalize font-medium mt-1"
                          style={{ color: prioridadColors[tema.prioridad] }}
                        >
                          Prioridad {tema.prioridad}
                        </p>
                      )}
                    </div>
                  );
                }}
              />
            </Treemap>
          </ResponsiveContainer>
        </div>

        {/* Leyenda de prioridades */}
        <div className="mt-4 flex justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: prioridadColors.alta }} />
            <span className="text-xs text-muted-foreground">Prioridad Alta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: prioridadColors.media }} />
            <span className="text-xs text-muted-foreground">Prioridad Media</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: prioridadColors.baja }} />
            <span className="text-xs text-muted-foreground">Prioridad Baja</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
