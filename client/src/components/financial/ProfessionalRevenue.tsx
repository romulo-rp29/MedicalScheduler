import { useQuery } from "@tanstack/react-query";
import { User, ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProfessionalRevenueProps {
  startDate: string;
  endDate: string;
}

export default function ProfessionalRevenue({ startDate, endDate }: ProfessionalRevenueProps) {
  const [period, setPeriod] = useState<string>("month");
  const [sortField, setSortField] = useState<string>("totalValue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  const { data: professionalRevenue, isLoading } = useQuery({
    queryKey: [
      "/api/financial/by-professional", 
      { startDate, endDate }
    ],
    enabled: !!startDate && !!endDate,
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortData = (data: any[]) => {
    if (!data) return [];
    
    return [...data].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case "professional.name":
          aValue = a.professional.name;
          bValue = b.professional.name;
          break;
        case "appointmentsCount":
          aValue = a.appointmentsCount;
          bValue = b.appointmentsCount;
          break;
        case "totalValue":
          aValue = a.totalValue;
          bValue = b.totalValue;
          break;
        case "commission":
          aValue = a.commission;
          bValue = b.commission;
          break;
        case "professionalValue":
          aValue = a.professionalValue;
          bValue = b.professionalValue;
          break;
        default:
          aValue = a.totalValue;
          bValue = b.totalValue;
      }
      
      if (sortDirection === "asc") {
        return typeof aValue === "string" 
          ? aValue.localeCompare(bValue)
          : aValue - bValue;
      } else {
        return typeof aValue === "string"
          ? bValue.localeCompare(aValue)
          : bValue - aValue;
      }
    });
  };

  const sortedData = sortData(professionalRevenue);

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-medium">Faturamento por Profissional</h3>
          <div className="animate-pulse w-32 h-8 bg-gray-200 rounded"></div>
        </div>
        <div className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-gray-200 rounded w-full"></div>
            <div className="h-16 bg-gray-200 rounded w-full"></div>
            <div className="h-16 bg-gray-200 rounded w-full"></div>
            <div className="h-16 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-medium">Faturamento por Profissional</h3>
        <Select 
          value={period} 
          onValueChange={setPeriod}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Este Mês</SelectItem>
            <SelectItem value="prev_month">Mês Anterior</SelectItem>
            <SelectItem value="quarter">Últimos 3 Meses</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 data-table">
            <thead>
              <tr>
                <th 
                  scope="col"
                  className="cursor-pointer"
                  onClick={() => handleSort("professional.name")}
                >
                  <div className="flex items-center">
                    Profissional
                    {sortField === "professional.name" && (
                      <ArrowUpDown className="ml-1 h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col"
                  className="cursor-pointer"
                  onClick={() => handleSort("appointmentsCount")}
                >
                  <div className="flex items-center">
                    Atendimentos
                    {sortField === "appointmentsCount" && (
                      <ArrowUpDown className="ml-1 h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col"
                  className="cursor-pointer"
                  onClick={() => handleSort("totalValue")}
                >
                  <div className="flex items-center">
                    Faturamento
                    {sortField === "totalValue" && (
                      <ArrowUpDown className="ml-1 h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col"
                  className="cursor-pointer"
                  onClick={() => handleSort("commission")}
                >
                  <div className="flex items-center">
                    Comissão
                    {sortField === "commission" && (
                      <ArrowUpDown className="ml-1 h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col"
                  className="cursor-pointer"
                  onClick={() => handleSort("professionalValue")}
                >
                  <div className="flex items-center">
                    Valor Profissional
                    {sortField === "professionalValue" && (
                      <ArrowUpDown className="ml-1 h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData && sortedData.length > 0 ? (
                sortedData.map((prof: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50 transition-all">
                    <td>
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-3">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{prof.professional.name}</p>
                          <p className="text-xs text-gray-500">{prof.professional.specialty}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">{prof.appointmentsCount}</div>
                    </td>
                    <td>
                      <div className="text-sm">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(prof.totalValue)}
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">{prof.commission}%</div>
                    </td>
                    <td>
                      <div className="text-sm font-medium">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(prof.professionalValue)}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">
                    Nenhum dado encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
