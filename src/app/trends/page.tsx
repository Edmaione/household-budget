"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import { useTrendData } from "@/lib/hooks";
import type { TwelveMonthAvg } from "@/lib/hooks";
import { formatCurrency, getShortMonthLabel, cn } from "@/lib/utils";
import type { MonthlyTotals, CategoryTrend } from "@/lib/types";
import {
  ResponsiveContainer,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ComposedChart,
  Area,
  Line,
  ReferenceLine,
  Cell,
} from "recharts";

// ─── Theme colors ─────────────────────────────────────────────────

const COLORS = {
  budgetLight: "#b8dbff",
  budget: "#3b82f6",
  over: "#ef4444",
  income: "#22c55e",
  incomeLight: "#dcfce7",
  overLight: "#ffe3e3",
  grid: "#f5f5f4",
  axis: "#a8a29e",
  stone200: "#e7e5e4",
  ma: "#f97316", // orange for 3-mo moving average
  ma12: "#a855f7", // purple for 12-mo average
};

// ─── Moving Average Helper ───────────────────────────────────────

/** Calculate a simple moving average over `window` periods.
 *  Returns null for the first (window - 1) entries. */
function movingAverage(values: number[], window: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) return null;
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) sum += values[j];
    return Math.round((sum / window) * 100) / 100;
  });
}

// ─── Main Page ────────────────────────────────────────────────────

type Tab = "overview" | "categories";

export default function TrendsPage() {
  const [range, setRange] = useState<3 | 6 | 12>(6);
  const [tab, setTab] = useState<Tab>("overview");
  const { monthlyTotals, categoryTrends, months, twelveMonthAvg, loading } =
    useTrendData(range);

  // Months with actual data (non-zero)
  const hasData = monthlyTotals.some(
    (m) => m.totalExpense > 0 || m.totalIncome > 0
  );

  // Averages (only over months with data)
  const dataMonths = monthlyTotals.filter(
    (m) => m.totalExpense > 0 || m.totalIncome > 0
  );
  const avgIncome =
    dataMonths.length > 0
      ? dataMonths.reduce((s, m) => s + m.totalIncome, 0) / dataMonths.length
      : 0;
  const avgExpense =
    dataMonths.length > 0
      ? dataMonths.reduce((s, m) => s + m.totalExpense, 0) / dataMonths.length
      : 0;
  const avgNet = avgIncome - avgExpense;

  return (
    <AppShell>
      <div className="px-4 pt-6">
        {/* Header + Range Selector */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-stone-900">Trends</h1>
          <RangeSelector value={range} onChange={setRange} />
        </div>

        {/* Tab Selector */}
        <TabSelector value={tab} onChange={setTab} />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasData ? (
          <div className="text-center py-20">
            <p className="text-stone-400 text-sm">
              Not enough data yet. Keep tracking your spending!
            </p>
          </div>
        ) : tab === "overview" ? (
          <>
            {/* Spending Chart */}
            <section className="mb-6">
              <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2 px-1">
                Spending
              </h2>
              <SpendingChart
                data={monthlyTotals}
                avgExpense12={twelveMonthAvg.expense}
              />
            </section>

            {/* Net Savings */}
            <section className="mb-6">
              <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2 px-1">
                Net Savings
              </h2>
              <NetSavingsChart
                data={monthlyTotals}
                avgNet12={twelveMonthAvg.net}
              />
            </section>

            {/* Average Cards */}
            <section className="mb-6">
              <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2 px-1">
                Averages
              </h2>
              <AverageCards
                avgIncome={avgIncome}
                avgExpense={avgExpense}
                avgNet={avgNet}
                monthCount={dataMonths.length}
              />
            </section>

            {/* Category Breakdown */}
            {categoryTrends.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2 px-1">
                  By Category
                </h2>
                <CategoryBreakdown
                  trends={categoryTrends}
                  months={months}
                />
              </section>
            )}
          </>
        ) : (
          <>
            {/* Category Trendlines */}
            {categoryTrends.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2 px-1">
                  Category Trends
                </h2>
                <CategoryTrendlines
                  trends={categoryTrends}
                  avgByCategory={twelveMonthAvg.byCategory}
                />
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

// ─── Tab Selector ────────────────────────────────────────────────

function TabSelector({
  value,
  onChange,
}: {
  value: Tab;
  onChange: (v: Tab) => void;
}) {
  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "categories", label: "Category Trends" },
  ];
  return (
    <div className="flex bg-stone-100 rounded-lg p-0.5 mb-5">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "flex-1 py-1.5 text-xs font-medium rounded-md transition-all text-center",
            value === t.key
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Range Selector ───────────────────────────────────────────────

function RangeSelector({
  value,
  onChange,
}: {
  value: 3 | 6 | 12;
  onChange: (v: 3 | 6 | 12) => void;
}) {
  const options: (3 | 6 | 12)[] = [3, 6, 12];
  return (
    <div className="flex bg-stone-100 rounded-lg p-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-md transition-all",
            value === opt
              ? "bg-blue-600 text-white shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          )}
        >
          {opt}M
        </button>
      ))}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white rounded-lg border border-stone-200 shadow-lg p-2.5 text-xs">
      <p className="text-stone-500 font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-stone-600">{entry.name}:</span>
          <span className="font-mono tabular-nums text-stone-900 font-medium">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Spending Chart ───────────────────────────────────────────────

function SpendingChart({
  data,
  avgExpense12,
}: {
  data: MonthlyTotals[];
  avgExpense12: number;
}) {
  const actuals = data.map((m) => m.totalExpense);
  const ma = movingAverage(actuals, 3);

  const chartData = data.map((m, i) => ({
    month: getShortMonthLabel(m.month),
    Budget: m.budgetExpense,
    Actual: m.totalExpense,
    "3-mo avg": ma[i],
    isOver: m.totalExpense > m.budgetExpense && m.budgetExpense > 0,
  }));

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
          barGap={2}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={COLORS.grid}
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: COLORS.axis }}
            tickLine={false}
            axisLine={{ stroke: COLORS.stone200 }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: COLORS.axis }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
            }
          />
          <Tooltip content={<CustomTooltip />} />
          {/* 12-month average reference line */}
          {avgExpense12 > 0 && (
            <ReferenceLine
              y={avgExpense12}
              stroke={COLORS.ma12}
              strokeDasharray="8 4"
              strokeWidth={1.5}
              strokeOpacity={0.7}
            />
          )}
          <Bar
            dataKey="Budget"
            fill={COLORS.budgetLight}
            radius={[3, 3, 0, 0]}
            maxBarSize={32}
          />
          <Bar dataKey="Actual" radius={[3, 3, 0, 0]} maxBarSize={32}>
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.isOver ? COLORS.over : COLORS.budget}
              />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="3-mo avg"
            stroke={COLORS.ma}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            strokeDasharray="6 3"
          />
        </ComposedChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 px-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-2 rounded-sm"
            style={{ backgroundColor: COLORS.budgetLight }}
          />
          <span className="text-[10px] text-stone-500">Budget</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-2 rounded-sm"
            style={{ backgroundColor: COLORS.budget }}
          />
          <span className="text-[10px] text-stone-500">Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-0 border-t-2 border-dashed"
            style={{ borderColor: COLORS.ma }}
          />
          <span className="text-[10px] text-stone-500">3-mo avg</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-0 border-t-2 border-dashed"
            style={{ borderColor: COLORS.ma12 }}
          />
          <span className="text-[10px] text-stone-500">12-mo avg</span>
        </div>
      </div>
    </div>
  );
}

// ─── Net Savings Chart ────────────────────────────────────────────

function NetSavingsChart({
  data,
  avgNet12,
}: {
  data: MonthlyTotals[];
  avgNet12: number;
}) {
  const nets = data.map((m) => m.net);
  const ma = movingAverage(nets, 3);

  const chartData = data.map((m, i) => ({
    month: getShortMonthLabel(m.month),
    Net: m.net,
    "3-mo avg": ma[i],
  }));

  // Split positive/negative for coloring
  const hasPositive = chartData.some((d) => d.Net > 0);
  const hasNegative = chartData.some((d) => d.Net < 0);

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
        >
          <defs>
            <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={COLORS.income}
                stopOpacity={0.15}
              />
              <stop
                offset="50%"
                stopColor={COLORS.income}
                stopOpacity={0.02}
              />
              <stop
                offset="50%"
                stopColor={COLORS.over}
                stopOpacity={0.02}
              />
              <stop
                offset="100%"
                stopColor={COLORS.over}
                stopOpacity={0.15}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={COLORS.grid}
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: COLORS.axis }}
            tickLine={false}
            axisLine={{ stroke: COLORS.stone200 }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: COLORS.axis }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => {
              const abs = Math.abs(v);
              const formatted =
                abs >= 1000 ? `$${(abs / 1000).toFixed(0)}k` : `$${abs}`;
              return v < 0 ? `-${formatted}` : formatted;
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={0}
            stroke={COLORS.axis}
            strokeDasharray="3 3"
            strokeWidth={1}
          />
          {/* 12-month average reference line */}
          <ReferenceLine
            y={avgNet12}
            stroke={COLORS.ma12}
            strokeDasharray="8 4"
            strokeWidth={1.5}
            strokeOpacity={0.7}
          />
          <Area
            type="monotone"
            dataKey="Net"
            fill="url(#netGradient)"
            stroke="none"
          />
          <Line
            type="monotone"
            dataKey="Net"
            stroke={hasNegative && !hasPositive ? COLORS.over : COLORS.income}
            strokeWidth={2}
            dot={{
              r: 4,
              fill: "#fff",
              stroke: COLORS.income,
              strokeWidth: 2,
            }}
            activeDot={{ r: 5, strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="3-mo avg"
            stroke={COLORS.ma}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            strokeDasharray="6 3"
          />
        </ComposedChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 px-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-0.5 rounded-full"
            style={{ backgroundColor: COLORS.income }}
          />
          <span className="text-[10px] text-stone-500">Net</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-0 border-t-2 border-dashed"
            style={{ borderColor: COLORS.ma }}
          />
          <span className="text-[10px] text-stone-500">3-mo avg</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-0 border-t-2 border-dashed"
            style={{ borderColor: COLORS.ma12 }}
          />
          <span className="text-[10px] text-stone-500">12-mo avg</span>
        </div>
      </div>
    </div>
  );
}

// ─── Average Cards ────────────────────────────────────────────────

function AverageCards({
  avgIncome,
  avgExpense,
  avgNet,
  monthCount,
}: {
  avgIncome: number;
  avgExpense: number;
  avgNet: number;
  monthCount: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-white rounded-xl p-3 border border-stone-200">
        <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1">
          Avg Income
        </p>
        <p className="text-base font-semibold font-mono tabular-nums text-stone-900">
          {formatCurrency(avgIncome)}
        </p>
        <p className="text-[10px] text-stone-400 mt-0.5">
          / {monthCount} mo
        </p>
      </div>
      <div className="bg-white rounded-xl p-3 border border-stone-200">
        <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1">
          Avg Spend
        </p>
        <p className="text-base font-semibold font-mono tabular-nums text-stone-900">
          {formatCurrency(avgExpense)}
        </p>
        <p className="text-[10px] text-stone-400 mt-0.5">
          / {monthCount} mo
        </p>
      </div>
      <div className="bg-white rounded-xl p-3 border border-stone-200">
        <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1">
          Avg Net
        </p>
        <p
          className={cn(
            "text-base font-semibold font-mono tabular-nums",
            avgNet >= 0 ? "text-emerald-600" : "text-red-600"
          )}
        >
          {avgNet >= 0 ? "+" : "-"}
          {formatCurrency(avgNet)}
        </p>
        <p className="text-[10px] text-stone-400 mt-0.5">
          / {monthCount} mo
        </p>
      </div>
    </div>
  );
}

// ─── Category Breakdown ───────────────────────────────────────────

function CategoryBreakdown({
  trends,
  months,
}: {
  trends: CategoryTrend[];
  months: string[];
}) {
  // Find the two most recent months with data
  const monthsWithData = months.filter((m) =>
    trends.some((cat) => {
      const md = cat.monthlyData.find((d) => d.month === m);
      return md && md.actual > 0;
    })
  );
  const latestMonth = monthsWithData[monthsWithData.length - 1] || null;
  const prevMonth = monthsWithData[monthsWithData.length - 2] || null;

  return (
    <div className="space-y-1.5">
      {trends.map((cat) => {
        const latest = cat.monthlyData.find((d) => d.month === latestMonth);
        const prev = cat.monthlyData.find((d) => d.month === prevMonth);
        const latestActual = latest?.actual || 0;
        const prevActual = prev?.actual || 0;
        const budget = latest?.budget || 0;

        // Month-over-month change
        const change = prevActual > 0 ? latestActual - prevActual : null;
        const changePct =
          prevActual > 0
            ? ((latestActual - prevActual) / prevActual) * 100
            : null;

        // Budget usage
        const budgetPct =
          budget > 0 ? Math.min((latestActual / budget) * 100, 100) : 0;
        const isOver = latestActual > budget && budget > 0;

        // Only show categories that have any data at all
        const hasAnyData = cat.monthlyData.some((d) => d.actual > 0);
        if (!hasAnyData) return null;

        return (
          <div
            key={cat.categoryId}
            className="bg-white rounded-xl border border-stone-200 px-3.5 py-3"
          >
            {/* Row 1: Icon, Name, Latest Amount, Change */}
            <div className="flex items-center gap-2.5">
              <span className="text-base leading-none shrink-0">
                {cat.categoryIcon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-900 truncate">
                    {cat.categoryName}
                  </span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span
                      className={cn(
                        "text-sm font-semibold font-mono tabular-nums",
                        isOver ? "text-red-600" : "text-stone-900"
                      )}
                    >
                      {formatCurrency(latestActual)}
                    </span>
                    {change !== null && change !== 0 && (
                      <span
                        className={cn(
                          "text-[11px] font-mono tabular-nums flex items-center gap-0.5",
                          change > 0 ? "text-red-500" : "text-emerald-500"
                        )}
                      >
                        <svg
                          className={cn(
                            "w-3 h-3",
                            change < 0 && "rotate-180"
                          )}
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2.5}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
                          />
                        </svg>
                        {Math.abs(changePct!).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 2: Budget bar */}
                {budget > 0 && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isOver ? "bg-red-500" : "bg-blue-500"
                        )}
                        style={{ width: `${budgetPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-stone-400 shrink-0">
                      {isOver ? (
                        <span className="text-red-500">
                          +{formatCurrency(latestActual - budget)} over
                        </span>
                      ) : (
                        <>{formatCurrency(budget - latestActual)} left</>
                      )}
                    </span>
                  </div>
                )}

                {/* Row 3: Monthly amounts */}
                <div className="flex items-center gap-1 mt-1.5 overflow-x-auto">
                  {cat.monthlyData
                    .filter((d) => {
                      // Show months that have data or are the latest month
                      return d.actual > 0 || d.month === latestMonth;
                    })
                    .map((d) => {
                      const isLatest = d.month === latestMonth;
                      const isOverBudget = d.actual > (d.budget || Infinity);
                      return (
                        <span
                          key={d.month}
                          className={cn(
                            "text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded",
                            isLatest
                              ? isOverBudget
                                ? "bg-red-50 text-red-600 font-medium"
                                : "bg-blue-50 text-blue-600 font-medium"
                              : "text-stone-400"
                          )}
                        >
                          {getShortMonthLabel(d.month)}{" "}
                          {formatCurrency(d.actual)}
                        </span>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Category Trendlines ──────────────────────────────────────────

// Distinct colors for each category line chart
const CAT_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f59e0b", // amber
  "#10b981", // emerald
  "#f43f5e", // rose
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#e879f9", // fuchsia
  "#fb923c", // orange
  "#a3e635", // lime
  "#38bdf8", // sky
];

function CategoryTrendlines({
  trends,
  avgByCategory,
}: {
  trends: CategoryTrend[];
  avgByCategory: Record<number, number>;
}) {
  // Only show categories that have data in at least 1 month
  const activeTrends = trends.filter((cat) =>
    cat.monthlyData.some((d) => d.actual > 0)
  );

  return (
    <div className="space-y-3">
      {activeTrends.map((cat, catIdx) => {
        const color = CAT_COLORS[catIdx % CAT_COLORS.length];
        const actuals = cat.monthlyData.map((d) => d.actual);
        const ma = movingAverage(actuals, 3);
        const avg12 = avgByCategory[cat.categoryId] || 0;

        const chartData = cat.monthlyData.map((d, i) => ({
          month: getShortMonthLabel(d.month),
          Actual: d.actual,
          Budget: d.budget,
          "3-mo avg": ma[i],
        }));

        const budget = cat.monthlyData[0]?.budget || 0;

        return (
          <div
            key={cat.categoryId}
            className="bg-white rounded-xl border border-stone-200 p-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">
                  {cat.categoryIcon}
                </span>
                <span className="text-sm font-medium text-stone-900">
                  {cat.categoryName}
                </span>
              </div>
              {budget > 0 && (
                <span className="text-[10px] font-mono text-stone-400">
                  budget {formatCurrency(budget)}/mo
                </span>
              )}
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={140}>
              <ComposedChart
                data={chartData}
                margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id={`grad-${cat.categoryId}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={color}
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="100%"
                      stopColor={color}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={COLORS.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: COLORS.axis }}
                  tickLine={false}
                  axisLine={{ stroke: COLORS.stone200 }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: COLORS.axis }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                {/* Budget reference line */}
                {budget > 0 && (
                  <ReferenceLine
                    y={budget}
                    stroke={COLORS.over}
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    strokeOpacity={0.6}
                  />
                )}
                {/* 12-month average reference line */}
                {avg12 > 0 && (
                  <ReferenceLine
                    y={avg12}
                    stroke={COLORS.ma12}
                    strokeDasharray="8 4"
                    strokeWidth={1.5}
                    strokeOpacity={0.7}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="Actual"
                  fill={`url(#grad-${cat.categoryId})`}
                  stroke={color}
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    fill: "#fff",
                    stroke: color,
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 5, strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="3-mo avg"
                  stroke={COLORS.ma}
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                  strokeDasharray="6 3"
                />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-2 px-1 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3 h-0.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] text-stone-500">Actual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3 h-0 border-t-2 border-dashed"
                  style={{ borderColor: COLORS.ma }}
                />
                <span className="text-[10px] text-stone-500">3-mo avg</span>
              </div>
              {avg12 > 0 && (
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-0 border-t-2 border-dashed"
                    style={{ borderColor: COLORS.ma12 }}
                  />
                  <span className="text-[10px] text-stone-500">12-mo avg</span>
                </div>
              )}
              {budget > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0 border-t border-dashed border-red-400" />
                  <span className="text-[10px] text-stone-500">Budget</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
