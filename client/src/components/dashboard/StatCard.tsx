import { TrendingUp, TrendingDown, Activity, Users, Calendar, Clock, CircleDollarSign } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: "patients" | "appointments" | "waiting" | "revenue";
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  color: "primary" | "success" | "orange" | "indigo";
}

export default function StatCard({ title, value, icon, trend, color }: StatCardProps) {
  const getIcon = () => {
    switch (icon) {
      case "patients":
        return <Users className={`h-7 w-7 text-${color}-500`} />;
      case "appointments":
        return <Calendar className={`h-7 w-7 text-${color}-500`} />;
      case "waiting":
        return <Clock className={`h-7 w-7 text-${color}-500`} />;
      case "revenue":
        return <CircleDollarSign className={`h-7 w-7 text-${color}-500`} />;
      default:
        return <Activity className={`h-7 w-7 text-${color}-500`} />;
    }
  };

  const getTrendIcon = () => {
    if (trend?.direction === "up") {
      return <TrendingUp className="h-3 w-3 mr-1 text-success-600" />;
    } else if (trend?.direction === "down") {
      return <TrendingDown className="h-3 w-3 mr-1 text-red-600" />;
    }
    return null;
  };

  const getTrendClass = () => {
    if (trend?.direction === "up") {
      return "text-success-600";
    } else if (trend?.direction === "down") {
      return "text-red-600";
    }
    return "text-gray-600";
  };

  return (
    <div className={`bg-white rounded-lg shadow p-4 border-l-4 border-${color}-500`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-semibold mt-1">{value}</p>
        </div>
        {getIcon()}
      </div>
      {trend && (
        <div className={`mt-3 text-xs font-medium ${getTrendClass()} flex items-center`}>
          {getTrendIcon()}
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  );
}
