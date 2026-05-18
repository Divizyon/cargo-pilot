import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { WeeklyTrendItem } from '@/lib/api/useDashboardStats';

const chartConfig: ChartConfig = {
  sevkiyat: { label: 'Yükleme Planları', color: 'hsl(var(--foreground))' },
};

interface Props {
  data: WeeklyTrendItem[];
}

export function WeeklyTrendChart({ data }: Props) {
  const hasTeslim = data.some((d) => d.teslim > 0);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-none">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-base font-semibold text-foreground">Haftalık Yükleme Planları Trendi</p>
          <p className="text-sm text-muted-foreground">Toplam yükleme planları trendi</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-foreground" />
            Yükleme Planları
          </span>
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-[220px] w-full mt-4">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="transparent" />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} domain={[0, 'auto']} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="sevkiyat"
            stroke="hsl(var(--foreground))"
            strokeWidth={1.5}
            fill="hsl(var(--foreground))"
            fillOpacity={0.08}
          />
          {hasTeslim && (
            <Area
              type="monotone"
              dataKey="teslim"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.5}
              fill="hsl(var(--muted-foreground))"
              fillOpacity={0.3}
            />
          )}
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
