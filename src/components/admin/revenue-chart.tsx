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

export default function RevenueChart({
  data,
}: {
  data: { day: string; revenue: number }[];
}) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#FAF7F2" />
          <XAxis
            dataKey="day"
            stroke="#5A5A7A"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="#5A5A7A"
            fontSize={12}
            tickLine={false}
            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #eee",
              borderRadius: "12px",
              color: "#1B1B4B",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [formatPrice(Number(value)), "Revenue"]}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#8B6410"
            strokeWidth={3}
            dot={{ fill: "#1B1B4B", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: "#8B6410" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}