interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  growth?: number;
  subtitle?: string;
}

export default function StatsCard({ title, value, icon, growth, subtitle }: StatsCardProps) {
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#333333] font-medium">{title}</p>
          <p className="text-3xl font-bold text-black mt-2">{value}</p>
          {growth !== undefined && (
            <p className={`text-xs font-medium mt-2 ${growth >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
              {growth >= 0 ? "↑" : "↓"} {Math.abs(growth)}% from previous period
            </p>
          )}
          {subtitle && <p className="text-xs text-[#666666] mt-2">{subtitle}</p>}
        </div>
        <span className="w-12 h-12 shrink-0 bg-gray-100 rounded-full flex items-center justify-center text-xl">
          {icon}
        </span>
      </div>
    </div>
  );
}