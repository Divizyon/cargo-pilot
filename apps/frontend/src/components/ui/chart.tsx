import * as React from 'react';
import * as RechartsPrimitive from 'recharts';
import { cn } from '@/lib/utils';

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  };
};

type ChartContextValue = { config: ChartConfig };
const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChart(): ChartContextValue {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error('useChart must be used within <ChartContainer />');
  return ctx;
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const entries = Object.entries(config).filter(([, v]) => v.color);
  if (!entries.length) return null;
  return (
    <style>{`[data-chart="${id}"] {\n${entries.map(([k, v]) => `  --color-${k}: ${v.color};`).join('\n')}\n}`}</style>
  );
}

export function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
}) {
  const uid = React.useId();
  const chartId = `chart-${id ?? uid.replace(/:/g, '')}`;
  return (
    <ChartContext.Provider value={{ config }}>
      <div data-chart={chartId} className={cn('flex justify-center text-xs', className)} {...props}>
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer debounce={50} minWidth={0}>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export function ChartTooltip(props: React.ComponentProps<typeof RechartsPrimitive.Tooltip>) {
  return <RechartsPrimitive.Tooltip {...props} />;
}

interface TooltipPayloadItem {
  dataKey?: string | number;
  name?: string | number;
  value?: number;
  color?: string;
  payload?: Record<string, unknown>;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  hideLabel = false,
  nameKey,
}: React.ComponentProps<'div'> & {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  hideLabel?: boolean;
  nameKey?: string;
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;
  return (
    <div
      className={cn(
        'min-w-[8rem] rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
        className,
      )}
    >
      {!hideLabel && label && <p className="mb-1 font-medium">{label}</p>}
      <div className="grid gap-1">
        {payload.map((item, i) => {
          const key =
            nameKey ?? (typeof item.dataKey === 'string' ? item.dataKey : String(item.name ?? ''));
          const cfg = config[key];
          return (
            <div key={i} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: cfg?.color ?? item.color }}
              />
              <span className="text-muted-foreground">{cfg?.label ?? item.name}</span>
              <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
                {(item.value ?? 0).toLocaleString('tr-TR')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
