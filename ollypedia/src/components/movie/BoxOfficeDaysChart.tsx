"use client";

// components/movie/BoxOfficeDaysChart.tsx
// Reads { day, net, gross } — matches your actual boxOfficeDays[] schema.

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";

// ── Parse raw number (1500000) or string ("₹1.5 Cr", "12L") → Crores ──
function parseToCr(val: string | number | undefined): number {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") {
    if (val >= 1_00_00_000) return val / 1_00_00_000;
    if (val >= 1_00_000)    return val / 1_00_00_000;
    return val; // already in Cr or tiny value
  }
  const s = String(val).replace(/[₹,\s]/g, "").toLowerCase();
  if (s.includes("cr")) return parseFloat(s) || 0;
  if (s.includes("l"))  return (parseFloat(s) || 0) / 100;
  if (s.includes("k"))  return (parseFloat(s) || 0) / 10_000;
  const n = parseFloat(s);
  if (!isNaN(n)) {
    if (n >= 1_00_00_000) return n / 1_00_00_000;
    if (n >= 1_00_000)    return n / 1_00_00_000;
    return n;
  }
  return 0;
}

function fmtCr(val: number): string {
  if (val >= 1)    return `${val.toFixed(2)} Cr`;
  if (val >= 0.01) return `${(val * 100).toFixed(2)} L`;
  if (val > 0)     return `₹${Math.round(val * 1_00_00_000).toLocaleString("en-IN")}`;
  return "—";
}

// ── Matches your actual BoxOfficeDay type ──
interface BoxOfficeDay {
  day:        number;
  net:        number | string;
  gross?:     number | string;
  date?:      string;
  note?:      string;
  screens?:   number;
  occupancy?: string;
}

interface Props {
  days: BoxOfficeDay[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1a1a1a",
      border: "1px solid #333",
      borderRadius: 8,
      padding: "7px 11px",
      fontSize: 11,
      lineHeight: 1.6,
      pointerEvents: "none",
    }}>
      <p style={{ color: "#9ca3af", marginBottom: 2 }}>{label}</p>
      <p style={{ color: "#4ade80", fontWeight: 700 }}>{fmtCr(payload[0].value)}</p>
    </div>
  );
}

export function BoxOfficeDaysChart({ days }: Props) {
  if (!days?.length) return null;

  // Sort by day number, take last 14
  const sorted = [...days].sort((a, b) => a.day - b.day).slice(-14);

  const data = sorted.map((d) => ({
    name:  `D${d.day}`,
    full:  `Day ${d.day}`,
    value: parseToCr(d.net),
    gross: parseToCr(d.gross),
  }));

  // Filter out zero-value entries for stats
  const nonZero = data.filter((d) => d.value > 0);
  if (!nonZero.length) return null;

  const max = Math.max(...nonZero.map((d) => d.value));
  const avg = nonZero.reduce((s, d) => s + d.value, 0) / nonZero.length;

  // Smart Y-axis: zoom in when all values are clustered
  const min    = Math.min(...nonZero.map((d) => d.value));
  const spread = max - min;
  const yMin   = spread < max * 0.25 ? Math.max(0, min - spread * 1.5) : 0;

  const tickInterval = data.length > 10 ? 2 : data.length > 6 ? 1 : 0;

  return (
    <div className="mt-4 pt-4 border-t border-[#1f1f1f]">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
        Daily Collection
      </p>

      <ResponsiveContainer width="100%" height={120}>
        <BarChart
          data={data}
          barCategoryGap="18%"
          margin={{ top: 4, right: 4, left: 2, bottom: 0 }}
        >
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9, fill: "#6b7280" }}
            tickLine={false}
            axisLine={{ stroke: "#1f1f1f" }}
            interval={tickInterval}
          />
          <YAxis
            domain={[yMin, max * 1.1]}
            tick={{ fontSize: 9, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={fmtCr}
            width={54}
            tickCount={4}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          {/* Avg reference line */}
          <ReferenceLine
            y={avg}
            stroke="#374151"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={30}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={
                  d.value === max        ? "#f97316"   // peak → orange
                  : d.value >= max * 0.7 ? "#16a34a"   // strong → green
                  : d.value > 0          ? "#2563eb"   // regular → blue
                  :                        "#1f1f1f"   // zero → dark (no data)
                }
                fillOpacity={d.value > 0 ? 0.9 : 0.3}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-1 justify-end">
        {[
          { color: "#f97316", label: "Peak"    },
          { color: "#16a34a", label: "Strong"  },
          { color: "#2563eb", label: "Regular" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block", opacity: 0.9 }} />
            <span className="text-gray-600" style={{ fontSize: 9 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}