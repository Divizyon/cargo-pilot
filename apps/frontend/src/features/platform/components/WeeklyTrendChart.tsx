import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { WeeklyTrendItem } from '@/lib/api/useDashboardStats';

const chartConfig: ChartConfig = {
  sevkiyat: { label: 'Sevkiyat', color: 'var(--color-sevkiyat)' },
  teslim: { label: 'Teslim', color: 'var(--color-teslim)' },
};

interface Props {
  data: WeeklyTrendItem[];
}

export function WeeklyTrendChart({ data }: Props) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-none">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-base font-semibold text-foreground">Haftalık Sevkiyat Trendi</p>
          <p className="text-sm text-muted-foreground">Toplam sevkiyat ve teslim karşılaştırması</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-foreground" />
            Sevkiyat
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-zinc-300" />
            Teslim
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
            stroke="#18181b"
            strokeWidth={1.5}
            fill="#18181b"
            fillOpacity={0.08}
          />
          <Area
            type="monotone"
            dataKey="teslim"
            stroke="#d4d4d8"
            strokeWidth={1.5}
            fill="#d4d4d8"
            fillOpacity={0.3}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
