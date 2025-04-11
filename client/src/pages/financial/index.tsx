import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DollarSign, 
  TrendingUp, 
  Calendar,
  User,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Colors for charts
const COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f97316", // orange
  "#8b5cf6", // purple
  "#ec4899", // pink
];

export default function Financial() {
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState('today');
  const [professionalFilter, setProfessionalFilter] = useState('all');
  
  // Get date range based on filter
  const getDateRange = () => {
    const today = new Date();
    let startDate = new Date(today);
    let endDate = new Date(today);
    
    switch (dateFilter) {
      case 'today':
        return {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          label: 'Hoje'
        };
      case 'week':
        startDate.setDate(today.getDate() - 7);
        return {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          label: 'Últimos 7 dias'
        };
      case 'month':
        startDate.setMonth(today.getMonth() - 1);
        return {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          label: 'Último mês'
        };
      case 'year':
        startDate.setFullYear(today.getFullYear() - 1);
        return {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          label: 'Último ano'
        };
      default:
        return {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          label: 'Hoje'
        };
    }
  };
  
  const { start, end, label } = getDateRange();
  
  // Fetch professionals for dropdown
  const { data: professionals = [] } = useQuery({
    queryKey: ['/api/professionals'],
    enabled: user?.role === 'admin',
  });
  
  // Fetch financial data
  const { data: financialRecords = [], isLoading } = useQuery({
    queryKey: [
      user?.role === 'admin' ? '/api/financial-records' : `/api/financial-records/professional/${user?.id}`,
      { start, end }
    ],
  });
  
  // Filter financial records by professional if needed
  const filteredRecords = useMemo(() => {
    if (professionalFilter === 'all' || user?.role !== 'admin') {
      return financialRecords;
    }
    
    return financialRecords.filter((record: any) => 
      record.professionalId === parseInt(professionalFilter)
    );
  }, [financialRecords, professionalFilter, user]);
  
  // Calculate financial summaries
  const financialSummary = useMemo(() => {
    const totalGross = filteredRecords.reduce((sum: number, record: any) => 
      sum + record.totalValue, 0
    );
    
    const totalClinic = filteredRecords.reduce((sum: number, record: any) => 
      sum + record.clinicCommission, 0
    );
    
    const totalProfessional = filteredRecords.reduce((sum: number, record: any) => 
      sum + record.professionalValue, 0
    );
    
    // Count procedures by type for pie chart
    const procedureTypes: Record<string, { count: number, value: number }> = {};
    
    filteredRecords.forEach((record: any) => {
      const procedure = record.procedure;
      if (procedure) {
        const type = procedure.type;
        if (!procedureTypes[type]) {
          procedureTypes[type] = { count: 0, value: 0 };
        }
        procedureTypes[type].count += 1;
        procedureTypes[type].value += record.totalValue;
      }
    });
    
    const procedureTypeData = Object.entries(procedureTypes).map(([type, data]) => ({
      name: type === 'consultation' ? 'Consultas' : 
            type === 'exam' ? 'Exames' : 'Procedimentos',
      value: data.value,
      count: data.count
    }));
    
    return {
      totalGross,
      totalClinic,
      totalProfessional,
      procedureTypeData,
      recordCount: filteredRecords.length
    };
  }, [filteredRecords]);
  
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-start md:items-center flex-col md:flex-row mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Financeiro</h1>
            <p className="text-sm text-gray-500">
              {user?.role === 'admin' ? 'Visão geral financeira da clínica' : 'Seus rendimentos'}
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto flex-col sm:flex-row">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Últimos 7 dias</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
                <SelectItem value="year">Último ano</SelectItem>
              </SelectContent>
            </Select>
            
            {user?.role === 'admin' && (
              <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <User className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Profissional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os profissionais</SelectItem>
                  {professionals.map((professional: any) => (
                    <SelectItem 
                      key={professional.id} 
                      value={professional.id.toString()}
                    >
                      {professional.user?.name || `Profissional ${professional.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Valor Total</p>
                  <p className="text-3xl font-bold mt-1">
                    R$ {financialSummary.totalGross.toFixed(2)}
                  </p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {user?.role === 'admin' ? 'Valor Clínica' : 'Comissão Clínica'}
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    R$ {financialSummary.totalClinic.toFixed(2)}
                  </p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {user?.role === 'admin' ? 'Valor Profissionais' : 'Seu Valor'}
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    R$ {financialSummary.totalProfessional.toFixed(2)}
                  </p>
                </div>
                <div className="p-2 bg-purple-100 rounded-full">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Atendimentos</p>
                  <p className="text-3xl font-bold mt-1">
                    {financialSummary.recordCount}
                  </p>
                </div>
                <div className="p-2 bg-orange-100 rounded-full">
                  <FileText className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Resumo Financeiro</CardTitle>
              <CardDescription>
                {label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : financialSummary.recordCount > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: 'Total',
                          total: financialSummary.totalGross,
                          clinic: financialSummary.totalClinic,
                          professional: financialSummary.totalProfessional
                        }
                      ]}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" 
                        tickFormatter={(value) => `R$ ${value}`}
                      />
                      <YAxis type="category" dataKey="name" />
                      <Tooltip 
                        formatter={(value) => [`R$ ${value}`, '']}
                      />
                      <Legend />
                      <Bar dataKey="total" name="Valor Total" fill="#3b82f6" />
                      <Bar dataKey="clinic" name="Clínica" fill="#10b981" />
                      <Bar dataKey="professional" name="Profissional" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-gray-500">Nenhum dado disponível para o período selecionado.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Tipo</CardTitle>
              <CardDescription>
                Valores por tipo de atendimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : financialSummary.procedureTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={financialSummary.procedureTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {financialSummary.procedureTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`R$ ${value}`, '']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-gray-500">Nenhum dado disponível para o período selecionado.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Transactions Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Transações</CardTitle>
            <CardDescription>
              Histórico de transações do período
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : filteredRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      {user?.role === 'admin' && <TableHead>Profissional</TableHead>}
                      <TableHead>Paciente</TableHead>
                      <TableHead>Procedimento</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Comissão Clínica</TableHead>
                      <TableHead>Valor Profissional</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {new Date(record.createdAt).toLocaleDateString()}
                        </TableCell>
                        {user?.role === 'admin' && (
                          <TableCell>
                            <div className="flex items-center">
                              <Avatar className="h-6 w-6 mr-2">
                                <AvatarImage src="" alt={record.professional?.user?.name || ''} />
                                <AvatarFallback>
                                  {record.professional?.user?.name?.charAt(0) || 'P'}
                                </AvatarFallback>
                              </Avatar>
                              {record.professional?.user?.name || `Profissional ${record.professionalId}`}
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          {record.appointment?.patient?.name || `Paciente ${record.appointment?.patientId}`}
                        </TableCell>
                        <TableCell>
                          {record.appointment?.procedure?.name || 'Procedimento não especificado'}
                        </TableCell>
                        <TableCell>
                          R$ {record.totalValue.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          R$ {record.clinicCommission.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          R$ {record.professionalValue.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhuma transação encontrada para o período selecionado.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
