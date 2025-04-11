import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Link, useLocation } from 'wouter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { BadgeStatus } from '@/components/ui/badge-status';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

export default function WaitingQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch waiting queue data (global queue)
  const { data: waitingQueue = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/queue', { date: selectedDate }],
    queryFn: async ({ queryKey }) => {
      const [_, params] = queryKey as [string, { date: string }];
      const dateParam = params.date ? `date=${params.date}` : '';
      const url = `/api/queue?${dateParam}`;
      console.log("Buscando fila de espera:", url);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Erro ao buscar fila de espera');
      }
      return res.json();
    },
    // Refetch a cada 30 segundos para manter a fila atualizada
    refetchInterval: 30000,
  });

  // Fetch financial data for summaries
  const { data: financialData = [] } = useQuery<any[]>({
    queryKey: ['/api/financial-records/professional', user?.id, { date: selectedDate }],
    enabled: user?.role === 'medico',
  });

  // Update appointment status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      return apiRequest('PATCH', `/api/appointments/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: "Status atualizado",
        description: "O status do agendamento foi atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao atualizar o status",
        variant: "destructive",
      });
    },
  });

  const startAppointment = (id: number) => {
    // Primeiro atualizar o status para 'in_progress' e então navegar para a página de atendimento
    updateStatusMutation.mutate({ id, status: 'in_progress' }, {
      onSuccess: () => {
        // Só navega para a página de atendimento após o sucesso da atualização
        setLocation(`/doctors/consultation/${id}`);
      }
    });
  };

  const finishAppointment = (id: number) => {
    // Usar a nova tela de consulta médica
    setLocation(`/doctors/consultation/${id}`);
  };

  // Calculate financial summaries
  const calculateFinancialSummary = () => {
    const totalGross = financialData.reduce((sum: number, record: any) => sum + record.totalValue, 0);
    const totalClinic = financialData.reduce((sum: number, record: any) => sum + record.clinicCommission, 0);
    const totalProfessional = financialData.reduce((sum: number, record: any) => sum + record.professionalValue, 0);

    return {
      totalGross: totalGross.toFixed(2),
      totalClinic: totalClinic.toFixed(2),
      totalProfessional: totalProfessional.toFixed(2),
    };
  };

  const { totalGross, totalClinic, totalProfessional } = calculateFinancialSummary();

  // Filter appointments based on status
  const filteredQueue = (() => {
    // Primeiro filtra por status se necessário
    const statusFiltered = statusFilter === 'all' 
      ? waitingQueue 
      : waitingQueue.filter((appointment: any) => appointment.status === statusFilter);
    
    // Função para ordenar por diferentes critérios com base no status
    return statusFiltered.sort((a: any, b: any) => {
      // Se ambos estiverem com status "waiting", ordenar por data (check-in time)
      if (a.status === 'waiting' && b.status === 'waiting') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      
      // Se ambos estiverem com status "in_progress", ordenar por data (quando começou o atendimento)
      if (a.status === 'in_progress' && b.status === 'in_progress') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      
      // Prioridade de exibição: in_progress, waiting, scheduled, completed, cancelled
      const priority = {
        'in_progress': 1,
        'waiting': 2,
        'scheduled': 3,
        'completed': 4,
        'cancelled': 5
      };
      
      return priority[a.status as keyof typeof priority] - priority[b.status as keyof typeof priority];
    });
  })();

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Fila de Espera</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          {/* Date Selection and Controls */}
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
            <div className="flex items-center">
              <span className="mr-2 text-sm font-medium text-gray-700">Data:</span>
              <input 
                type="date" 
                className="shadow-sm focus:ring-primary focus:border-primary sm:text-sm border border-gray-300 rounded-md" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              >
                Hoje
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="waiting">Aguardando</SelectItem>
                  <SelectItem value="in_progress">Em Atendimento</SelectItem>
                  <SelectItem value="completed">Finalizado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Patient Queue Table */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredQueue.length > 0 ? (
            <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQueue.map((appointment: any) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="py-4">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src="" alt={appointment.patient?.name || ''} />
                            <AvatarFallback>
                              {appointment.patient?.name?.charAt(0) || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {appointment.patient?.name || 'Paciente'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {appointment.patient?.birthDate 
                                ? `${calculateAge(appointment.patient.birthDate)} anos` 
                                : ''} | {appointment.patient?.gender === 'male' ? 'M' : appointment.patient?.gender === 'female' ? 'F' : '-'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">
                          {new Date(appointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {appointment.status === 'waiting' && (
                            <span className="ml-1 text-xs font-medium text-orange-600">(check-in)</span>
                          )}
                          {appointment.status === 'in_progress' && (
                            <span className="ml-1 text-xs font-medium text-blue-600">(início)</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">
                          {appointment.procedures && appointment.procedures.length > 0 && appointment.procedures.some(p => p.type === 'consultation')
                            ? 'Consulta'
                            : appointment.procedures && appointment.procedures.length > 0 && appointment.procedures.some(p => p.type === 'exam')
                              ? 'Exame'
                              : appointment.procedure?.type === 'consultation'
                                ? 'Consulta'
                                : appointment.procedure?.type === 'exam'
                                  ? 'Exame'
                                  : 'Procedimento'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <BadgeStatus status={appointment.status} />
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        R$ {appointment.procedure?.value?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium space-x-2">
                        {/* Mostrar botão de Check-in para agendamentos marcados */}
                        {appointment.status === 'scheduled' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-orange-600 border-orange-600 hover:bg-orange-50"
                            onClick={() => {
                              // Verificar se o paciente precisa completar o cadastro
                              const needsCompletion = appointment.patient?.needsCompletion || 
                                                      appointment.patient?.phone === 'A preencher';
                              
                              // Primeiro fazer o check-in
                              updateStatusMutation.mutate({ id: appointment.id, status: 'waiting' }, {
                                onSuccess: () => {
                                  // Se precisar completar o cadastro, redirecionar para a página de edição
                                  if (needsCompletion && appointment.patient?.id) {
                                    setLocation(`/patients/edit/${appointment.patient.id}`);
                                  }
                                }
                              });
                            }}
                          >
                            Check-in
                          </Button>
                        )}
                        
                        {/* Iniciar atendimento - apenas para médicos e apenas se o paciente estiver em espera */}
                        {user?.role === 'medico' && appointment.status === 'waiting' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-primary border-primary"
                            onClick={() => startAppointment(appointment.id)}
                          >
                            Iniciar
                          </Button>
                        )}
                        
                        {/* Finalizar atendimento - apenas para médicos e apenas se o atendimento estiver em andamento */}
                        {user?.role === 'medico' && appointment.status === 'in_progress' && (
                          <Button 
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => finishAppointment(appointment.id)}
                          >
                            Finalizar
                          </Button>
                        )}
                        
                        {/* Sempre exibir o botão de visualizar */}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          asChild
                        >
                          <Link href={`/doctors/consultation/${appointment.id}`}>
                            Visualizar
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-8 text-center">
                <p className="text-gray-500">Nenhum agendamento encontrado para esta data ou filtro.</p>
              </div>
            </div>
          )}
          
          {/* Financial Summary Card */}
          {user?.role === 'medico' && (
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo Financeiro do Dia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Bruto
                      </dt>
                      <dd className="mt-1 text-3xl font-semibold text-gray-900">
                        R$ {totalGross}
                      </dd>
                    </div>
                    <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Taxa da Clínica
                      </dt>
                      <dd className="mt-1 text-3xl font-semibold text-gray-900">
                        R$ {totalClinic}
                      </dd>
                    </div>
                    <div className="px-4 py-5 bg-green-50 shadow rounded-lg overflow-hidden sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Valor Líquido
                      </dt>
                      <dd className="mt-1 text-3xl font-semibold text-green-700">
                        R$ {totalProfessional}
                      </dd>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Utility function to calculate age from birthdate
function calculateAge(birthdate: string) {
  const today = new Date();
  const birthDate = new Date(birthdate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
