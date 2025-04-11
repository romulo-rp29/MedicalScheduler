import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  MoreVertical,
  User,
  Clock,
  CheckCircle,
  Timer,
  Calendar,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format as formatDate } from "date-fns";

interface QueueFilters {
  professionalId?: number;
  date?: string;
  status?: string;
  type?: string;
}

export default function QueueTable() {
  const [filters, setFilters] = useState<QueueFilters>({
    date: new Date().toISOString().substring(0, 10),
  });
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const { user } = useAuth();

  // Only pre-set the professional filter if the current user is a medical professional
  if (user?.role === 'medico' && !filters.professionalId) {
    // Buscar o ID do profissional associado a este usuário médico
    useQuery({
      queryKey: ["/api/professionals/user", user?.id],
      queryFn: async () => {
        const res = await apiRequest("GET", `/api/professionals/user/${user?.id}`);
        const data = await res.json();
        if (data && data.id) {
          setFilters(prev => ({ ...prev, professionalId: data.id }));
        }
        return data;
      },
      enabled: user?.role === "medico" && !filters.professionalId
    });
  }

  // Fetch queue based on filters
  const { data: queue, isLoading, refetch } = useQuery({
    queryKey: ["/api/queue", filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (filters.professionalId) queryParams.append('professionalId', filters.professionalId.toString());
      if (filters.date) queryParams.append('date', filters.date);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.type) queryParams.append('type', filters.type);
      
      const res = await apiRequest("GET", `/api/queue?${queryParams.toString()}`);
      return res.json();
    },
    staleTime: 30000, // 30 seconds
  });

  // Fetch professionals for filter dropdown
  const { data: professionals = [] } = useQuery({
    queryKey: ["/api/professionals"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/professionals");
      return await res.json();
    }
  });

  // Start appointment mutation
  const startAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      return apiRequest("POST", `/api/appointments/${appointmentId}/start`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      toast({
        title: "Atendimento iniciado",
        description: "O paciente foi movido para atendimento.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao iniciar atendimento",
        description: error.message || "Não foi possível iniciar o atendimento.",
        variant: "destructive",
      });
    },
  });

  // Check-in appointment mutation
  const checkInAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      return apiRequest("POST", `/api/appointments/${appointmentId}/check-in`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      toast({
        title: "Check-in realizado",
        description: "O paciente foi adicionado à fila de espera.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao realizar check-in",
        description: error.message || "Não foi possível realizar o check-in.",
        variant: "destructive",
      });
    },
  });

  // Update appointment status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      appointmentId,
      status,
    }: {
      appointmentId: number;
      status: string;
    }) => {
      return apiRequest("PATCH", `/api/appointments/${appointmentId}/status`, {
        status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      toast({
        title: "Status atualizado",
        description: "O status do agendamento foi atualizado com sucesso.",
      });
      setShowAppointmentDialog(false);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message || "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    },
  });

  const handleStartAppointment = (appointmentId: number) => {
    startAppointmentMutation.mutate(appointmentId);
  };

  const handleCheckInAppointment = (appointmentId: number) => {
    checkInAppointmentMutation.mutate(appointmentId);
  };

  const handleStatusChange = (appointmentId: number, status: string) => {
    updateStatusMutation.mutate({ appointmentId, status });
  };

  const handleViewAppointment = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDialog(true);
  };

  const handleStartEvolution = (appointmentId: number) => {
    setLocation(`/evolutions/${appointmentId}`);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Agendado
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Aguardando
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Em atendimento
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            Concluído
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Cancelado
          </span>
        );
      case "no_show":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Não Compareceu
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const renderProcedureTypeBadge = (type: string) => {
    switch (type) {
      case "consultation":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Consulta
          </span>
        );
      case "exam":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Exame
          </span>
        );
      case "procedure":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            Procedimento
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {type}
          </span>
        );
    }
  };

  const renderStatusIcon = (appointment: any) => {
    if (!appointment.waitingSince) {
      return <div className="h-3 w-3 rounded-full bg-gray-300"></div>;
    }

    if (appointment.status === "in_progress") {
      return <div className="h-3 w-3 rounded-full bg-green-500"></div>;
    }

    return <div className="h-3 w-3 rounded-full bg-yellow-500"></div>;
  };

  const renderWaitingTime = (appointment: any) => {
    if (appointment.status === "in_progress") {
      return (
        <div className="flex items-center">
          <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
          <span>Em atendimento</span>
        </div>
      );
    }

    if (!appointment.waitingSince) {
      return <span className="text-gray-500">Não chegou</span>;
    }

    return (
      <div className="flex items-center">
        <Timer className="h-4 w-4 mr-1 text-yellow-500" />
        <span>
          {formatDistanceToNow(new Date(appointment.waitingSince), {
            locale: ptBR,
            addSuffix: false,
          })}
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Count summary data
  const totalScheduled = queue?.length || 0;
  const totalAttended = queue?.filter((a: any) => a.status === "completed").length || 0;
  const totalWaiting = queue?.filter((a: any) => a.status === "confirmed").length || 0;
  const totalNotArrived = queue?.filter((a: any) => !a.waitingSince && a.status === "scheduled").length || 0;

  return (
    <>
      <div className="lg:col-span-1 bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-700 mb-3">Filtros</h3>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="queue-professional"
              className="block text-sm font-medium text-gray-700"
            >
              Profissional
            </label>
            <Select
              value={filters.professionalId?.toString() || ""}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  professionalId: value ? parseInt(value) : undefined,
                })
              }
              disabled={user?.role === "medico"}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {professionals?.map((professional: any) => (
                  <SelectItem
                    key={professional.id}
                    value={professional.id.toString()}
                  >
                    {professional.user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label
              htmlFor="queue-date"
              className="block text-sm font-medium text-gray-700"
            >
              Data
            </label>
            <Input
              type="date"
              value={filters.date || ""}
              onChange={(e) =>
                setFilters({ ...filters, date: e.target.value })
              }
              className="mt-1 block w-full"
            />
          </div>

          <div>
            <label
              htmlFor="queue-type"
              className="block text-sm font-medium text-gray-700"
            >
              Tipo
            </label>
            <Select
              value={filters.type || ""}
              onValueChange={(value) =>
                setFilters({ ...filters, type: value || undefined })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="consultation">Consulta</SelectItem>
                <SelectItem value="exam">Exame</SelectItem>
                <SelectItem value="procedure">Procedimento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label
              htmlFor="queue-status"
              className="block text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <Select
              value={filters.status || ""}
              onValueChange={(value) =>
                setFilters({ ...filters, status: value || undefined })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="scheduled">Agendado</SelectItem>
                <SelectItem value="confirmed">Aguardando</SelectItem>
                <SelectItem value="in_progress">Em Atendimento</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
                <SelectItem value="no_show">Não Compareceu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            onClick={() => refetch()}
          >
            Aplicar Filtros
          </Button>
        </div>
      </div>

      <div className="lg:col-span-3 space-y-6">
        <div className="flex flex-col">
          <div className="overflow-x-auto">
            <div className="py-2 align-middle inline-block min-w-full">
              <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 data-table">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="relative pl-4 pr-3 py-3">
                        <span className="sr-only">Status</span>
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Paciente
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Horário
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Tipo
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Tempo de Espera
                      </th>
                      <th
                        scope="col"
                        className="relative px-3 py-3"
                      >
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {queue && queue.length > 0 ? (
                      queue.map((appointment: any) => (
                        <tr
                          key={appointment.id}
                          className={`hover:bg-gray-50 transition-all ${
                            appointment.status === "in_progress"
                              ? "bg-green-50"
                              : ""
                          }`}
                        >
                          <td className="pl-4 pr-3 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {renderStatusIcon(appointment)}
                            </div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-3">
                                <User className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {appointment.patient.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {appointment.patient.birthDate &&
                                    `${formatDistanceToNow(
                                      new Date(appointment.patient.birthDate),
                                      { addSuffix: true, locale: ptBR }
                                    )
                                      .replace("há ", "")
                                      .replace(" anos", " anos")}`}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {format(new Date(appointment.date), "HH:mm")}
                            </div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            {renderProcedureTypeBadge(appointment.procedure.type)}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            {renderWaitingTime(appointment)}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {appointment.status === "scheduled" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() =>
                                  handleCheckInAppointment(appointment.id)
                                }
                                className="mr-3"
                              >
                                Check-in
                              </Button>
                            )}
                            {appointment.status === "confirmed" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() =>
                                  handleStartAppointment(appointment.id)
                                }
                                className="mr-3"
                              >
                                Iniciar Atendimento
                              </Button>
                            )}
                            {appointment.status === "in_progress" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() =>
                                  handleStartEvolution(appointment.id)
                                }
                                className="mr-3"
                              >
                                Evoluir Paciente
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewAppointment(appointment)}
                            >
                              Ver Detalhes
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 text-center"
                        >
                          Nenhum paciente na fila
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-700 mb-3">Resumo do Dia</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-gray-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-semibold text-primary-600">
                {totalScheduled}
              </div>
              <div className="text-sm text-gray-500">Total Agendado</div>
            </div>

            <div className="border border-gray-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-semibold text-success-600">
                {totalAttended}
              </div>
              <div className="text-sm text-gray-500">Atendidos</div>
            </div>

            <div className="border border-gray-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-semibold text-yellow-600">
                {totalWaiting}
              </div>
              <div className="text-sm text-gray-500">Aguardando</div>
            </div>

            <div className="border border-gray-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-semibold text-gray-600">
                {totalNotArrived}
              </div>
              <div className="text-sm text-gray-500">Não Chegaram</div>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Details Dialog */}
      <Dialog
        open={showAppointmentDialog}
        onOpenChange={setShowAppointmentDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
            <DialogDescription>
              Informações detalhadas sobre o agendamento
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">
                    Paciente
                  </h4>
                  <p className="text-base">
                    {selectedAppointment.patient.name}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">
                    Profissional
                  </h4>
                  <p className="text-base">
                    {selectedAppointment.professional.user.name}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Data</h4>
                  <p className="text-base">
                    {formatDate(
                      new Date(selectedAppointment.date),
                      "dd/MM/yyyy",
                      { locale: ptBR }
                    )}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">
                    Horário
                  </h4>
                  <p className="text-base">
                    {formatDate(new Date(selectedAppointment.date), "HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Tipo</h4>
                  <p className="text-base">
                    {selectedAppointment.procedure.name}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Status</h4>
                  <div className="text-base">
                    {renderStatusBadge(selectedAppointment.status)}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">
                  Observações
                </h4>
                <p className="text-base text-gray-700">
                  {selectedAppointment.notes || "Nenhuma observação"}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">
                  Alterar Status
                </h4>
                <Select
                  onValueChange={(value) =>
                    handleStatusChange(selectedAppointment.id, value)
                  }
                  defaultValue={selectedAppointment.status}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="in_progress">Em Atendimento</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                    <SelectItem value="no_show">Não Compareceu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-end space-x-2">
            {selectedAppointment?.status === "confirmed" && (
              <Button
                onClick={() => {
                  handleStartAppointment(selectedAppointment.id);
                  setShowAppointmentDialog(false);
                }}
                variant="outline"
              >
                Iniciar Atendimento
              </Button>
            )}
            {selectedAppointment?.status === "in_progress" && (
              <Button
                onClick={() => {
                  handleStartEvolution(selectedAppointment.id);
                  setShowAppointmentDialog(false);
                }}
                variant="outline"
              >
                Evoluir Paciente
              </Button>
            )}
            <Button
              onClick={() => setShowAppointmentDialog(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
