"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatPrice } from "@/lib/helpers";

const AXIS_TICK = { fill: "#333333", fontSize: 12 };

export default function RevenueChart({
  data,
}: {
  data: { day: string; revenue: number }[];
}) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
          <XAxis
            dataKey="day"
            stroke="#999999"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: "#E5E5E5" }}
          />
          <YAxis
            stroke="#999999"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #E5E5E5",
              borderRadius: "12px",
              color: "#000",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            }}
            labelStyle={{ color: "#333333", fontWeight: 600 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [formatPrice(Number(value)), "Revenue"]}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#000000"
            strokeWidth={2.5}
            dot={{ fill: "#000000", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: "#000000" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}