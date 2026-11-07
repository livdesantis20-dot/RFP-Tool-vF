"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  ReferenceLine,
  CartesianGrid,
  LabelList,
} from "recharts";

const NAVY = "#1f3350";
const ACCENT = "#a77d3f";
const MUTED = "#5b6575";
const GRID = "#e1e5ea";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt2 = ((v: any) => (typeof v === "number" ? v.toFixed(2) : v)) as any;

export function HistogramChart({ data }: { data: { score: number; humanPct: number; aiPct: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -12 }}>
        <XAxis dataKey="score" tick={{ fill: MUTED, fontSize: 12 }} />
        <YAxis
          tick={{ fill: MUTED, fontSize: 12 }}
          domain={[0, 100]}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tickFormatter={((v: any) => `${Math.round(v)}%`) as any}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, border: `1px solid ${GRID}` }}
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={((v: any) => (typeof v === "number" ? `${v.toFixed(0)}%` : v)) as any}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="humanPct" name="Committee" fill={NAVY} radius={[3, 3, 0, 0]} />
        <Bar dataKey="aiPct" name="AI" fill={ACCENT} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BarChartH({
  data,
  height = 240,
  domain,
}: {
  data: { label: string; value: number }[];
  height?: number;
  domain?: [number, number];
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 44, bottom: 8, left: 8 }}>
        <XAxis type="number" tick={{ fill: MUTED, fontSize: 12 }} domain={domain ?? [0, "auto"]} />
        <YAxis type="category" dataKey="label" tick={{ fill: MUTED, fontSize: 12 }} width={150} />
        <Tooltip contentStyle={{ fontSize: 12, border: `1px solid ${GRID}` }} formatter={fmt2} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
        <Bar dataKey="value" fill={NAVY} radius={[0, 3, 3, 0]}>
          <LabelList dataKey="value" position="right" formatter={fmt2} style={{ fill: NAVY, fontSize: 11 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SpreadChart({ data }: { data: { label: string; std: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 44, bottom: 8, left: 8 }}>
        <XAxis type="number" tick={{ fill: MUTED, fontSize: 12 }} />
        <YAxis type="category" dataKey="label" tick={{ fill: MUTED, fontSize: 12 }} width={170} />
        <Tooltip contentStyle={{ fontSize: 12, border: `1px solid ${GRID}` }} formatter={fmt2} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
        <Bar dataKey="std" radius={[0, 3, 3, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.std > 0.5 ? "#b4532a" : d.std > 0.25 ? ACCENT : NAVY} />
          ))}
          <LabelList dataKey="std" position="right" formatter={fmt2} style={{ fill: NAVY, fontSize: 11 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AiVsHumanScatter({ data }: { data: { human: number; agent: number; vendor: string }[] }) {
  const all = data.flatMap((d) => [d.human, d.agent]);
  const lo = Math.max(1, Math.floor(((all.length ? Math.min(...all) : 1) - 0.25) * 2) / 2);
  const hi = Math.min(5, Math.ceil(((all.length ? Math.max(...all) : 5) + 0.25) * 2) / 2);
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart margin={{ top: 12, right: 24, bottom: 28, left: 8 }}>
        <CartesianGrid stroke={GRID} />
        <XAxis
          type="number"
          dataKey="human"
          name="Committee mean"
          domain={[lo, hi]}
          tick={{ fill: MUTED, fontSize: 12 }}
          label={{ value: "Committee mean", position: "insideBottom", offset: -8, fill: MUTED, fontSize: 12 }}
        />
        <YAxis
          type="number"
          dataKey="agent"
          name="AI evaluator"
          domain={[lo, hi]}
          tick={{ fill: MUTED, fontSize: 12 }}
          label={{ value: "AI evaluator", angle: -90, position: "insideLeft", fill: MUTED, fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, border: `1px solid ${GRID}` }}
          formatter={fmt2}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          labelFormatter={(() => "") as any}
          cursor={{ strokeDasharray: "3 3" }}
        />
        <ReferenceLine
          segment={[
            { x: lo, y: lo },
            { x: hi, y: hi },
          ]}
          stroke="#94a3b8"
          strokeDasharray="4 4"
        />
        <Scatter data={data} fill={ACCENT}>
          <LabelList dataKey="vendor" position="top" style={{ fill: NAVY, fontSize: 11 }} />
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
