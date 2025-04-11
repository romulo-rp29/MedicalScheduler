import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { 
  DollarSign, 
  Users, 
  Building, 
  User
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

interface FinancialSummaryProps {
  startDate: string;
  endDate: string;
  professionalId?: number;
}

export default function FinancialSummary({ 
  startDate, 
  endDate, 
  professionalId 
}: FinancialSummaryProps) {
  const { user } = useAuth();
  
  // Set professionalId if user is a professional
  const effectiveProfessionalId = user?.role === "professional" ? user.professionalId : professionalId;

  const { data: summary, isLoading } = useQuery({
    queryKey: [
      "/api/financial/summary", 
      { startDate, endDate, professionalId: effectiveProfessionalId }
    ],
    enabled: !!startDate && !!endDate,
  });

  // Calculate percentage change
  const { data: prevPeriodSummary } = useQuery({
    queryKey: [
      "/api/financial/summary",
      {
        startDate: format(subDays(new Date(startDate), 30), "yyyy-MM-dd"),
        endDate: format(subDays(new Date(endDate), 30), "yyyy-MM-dd"),
        professionalId: effectiveProfessionalId
      }
    ],
    enabled: !!startDate && !!endDate,
  });

  const calculatePercentageChange = (current: number, previous: number) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  const revenueChange = prevPeriodSummary?.totalValue 
    ? calculatePercentageChange(summary?.totalValue || 0, prevPeriodSummary.totalValue)
    : 0;

  const appointmentsChange = prevPeriodSummary?.appointmentsCount
    ? calculatePercentageChange(summary?.appointmentsCount || 0, prevPeriodSummary.appointmentsCount)
    : 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
            <div className="h-6 w-24 bg-gray-200 rounded mb-3"></div>
            <div className="h-8 w-32 bg-gray-200 rounded mb-3"></div>
            <div className="h-4 w-20 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Faturamento Total</p>
            <p className="text-2xl font-semibold mt-1">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(summary?.totalValue || 0)}
            </p>
          </div>
          <DollarSign className="text-primary-500 h-8 w-8" />
        </div>
        <div className={`mt-3 text-xs font-medium flex items-center ${
          revenueChange > 0 
            ? 'text-success-600' 
            : revenueChange < 0 
              ? 'text-red-600' 
              : 'text-gray-600'
        }`}>
          {revenueChange > 0 ? (
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          ) : revenueChange < 0 ? (
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          ) : null}
          <span>
            {revenueChange ? `${Math.abs(revenueChange).toFixed(0)}% do período anterior` : "Mesmo valor do período anterior"}
          </span>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Valor do Profissional</p>
            <p className="text-2xl font-semibold mt-1">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(summary?.professionalValue || 0)}
            </p>
          </div>
          <User className="text-success-500 h-8 w-8" />
        </div>
        <div className="mt-3 text-xs font-medium text-gray-600 flex items-center">
          <span>
            {((summary?.professionalValue / summary?.totalValue) * 100 || 0).toFixed(0)}% do faturamento
          </span>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Valor da Clínica</p>
            <p className="text-2xl font-semibold mt-1">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(summary?.clinicValue || 0)}
            </p>
          </div>
          <Building className="text-indigo-500 h-8 w-8" />
        </div>
        <div className="mt-3 text-xs font-medium text-gray-600 flex items-center">
          <span>
            {((summary?.clinicValue / summary?.totalValue) * 100 || 0).toFixed(0)}% do faturamento
          </span>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Atendimentos</p>
            <p className="text-2xl font-semibold mt-1">{summary?.appointmentsCount || 0}</p>
          </div>
          <Users className="text-orange-500 h-8 w-8" />
        </div>
        <div className={`mt-3 text-xs font-medium flex items-center ${
          appointmentsChange > 0 
            ? 'text-success-600' 
            : appointmentsChange < 0 
              ? 'text-red-600' 
              : 'text-gray-600'
        }`}>
          {appointmentsChange > 0 ? (
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          ) : appointmentsChange < 0 ? (
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          ) : null}
          <span>
            {appointmentsChange ? `${Math.abs(appointmentsChange).toFixed(0)}% do período anterior` : "Mesmo número do período anterior"}
          </span>
        </div>
      </div>
    </div>
  );
}
