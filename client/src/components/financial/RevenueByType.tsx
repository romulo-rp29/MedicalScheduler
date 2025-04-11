import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

interface RevenueByTypeProps {
  startDate: string;
  endDate: string;
  professionalId?: number;
}

export default function RevenueByType({ 
  startDate, 
  endDate, 
  professionalId 
}: RevenueByTypeProps) {
  const { user } = useAuth();
  
  // Set professionalId if user is a professional
  const effectiveProfessionalId = user?.role === "professional" ? user.professionalId : professionalId;

  const { data: revenueByType, isLoading } = useQuery({
    queryKey: [
      "/api/financial/by-type", 
      { startDate, endDate, professionalId: effectiveProfessionalId }
    ],
    enabled: !!startDate && !!endDate,
  });

  const getProcedureTypeLabel = (type: string) => {
    switch (type) {
      case "consultation":
        return "Consultas";
      case "exam":
        return "Exames";
      case "procedure":
        return "Procedimentos";
      default:
        return type;
    }
  };

  const getBarColor = (type: string) => {
    switch (type) {
      case "consultation":
        return "bg-blue-500";
      case "exam":
        return "bg-purple-500";
      case "procedure":
        return "bg-indigo-500";
      default:
        return "bg-gray-500";
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="font-medium">Faturamento por Tipo</h3>
        </div>
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-gray-200 rounded w-full"></div>
            <div className="h-24 bg-gray-200 rounded w-full"></div>
            <div className="h-24 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h3 className="font-medium">Faturamento por Tipo</h3>
      </div>
      <div className="p-4">
        <div className="space-y-4">
          {revenueByType?.byType && Object.keys(revenueByType.byType).map((type: string) => {
            const data = revenueByType.byType[type];
            if (data.count === 0) return null;
            
            return (
              <div key={type} className="p-3 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{getProcedureTypeLabel(type)}</p>
                    <p className="text-xs text-gray-500">{data.count} atendimentos</p>
                  </div>
                  <span className="text-sm font-medium">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(data.value)}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full">
                  <div 
                    className={`h-2 ${getBarColor(type)} rounded-full`} 
                    style={{ width: `${data.percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1 text-right">{data.percentage}% do total</p>
              </div>
            );
          })}
          
          <div className="mt-4">
            <Button variant="outline" className="w-full">
              Exportar Relatório
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
