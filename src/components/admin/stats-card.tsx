interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  growth?: number;
  subtitle?: string;
}

export default function StatsCard({ title, value, icon, growth, subtitle }: StatsCardProps) {
  return (
    <div className="card rounded-2xl p-5 border-t-[3px] border-t-[#8B6410] relative">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#5A5A7A] font-medium">{title}</p>
          <p className="text-2xl font-bold text-[#1B1B4B] mt-1">{value}</p>
          {growth !== undefined && (
            <p className={`text-xs font-medium mt-1 ${growth >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
              {growth >= 0 ? "↑" : "↓"} {Math.abs(growth)}%
            </p>
          )}
          {subtitle && <p className="text-xs text-[#5A5A7A] mt-1">{subtitle}</p>}
        </div>
        <span className="text-2xl text-[#8B6410]">{icon}</span>
      </div>
    </div>
  );
}
