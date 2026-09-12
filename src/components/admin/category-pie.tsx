"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const PIE_COLORS = ["#0A0A0A", "#525252", "#A3A3A3", "#D4D4D4"];

export default function CategoryPie({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={4}
            dataKey="value"
            nameKey="name"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #E5E5E5",
              borderRadius: "12px",
              color: "#000",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}