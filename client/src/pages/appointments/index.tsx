import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Calendar as CalendarIcon,
  User,
  Users,
  Search,
  Clock,
  Stethoscope,
  AlertCircle,
  Filter,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BadgeStatus } from "@/components/ui/badge-status";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  Appointment,
  appointmentFormSchema,
  type AppointmentFormData,
} from "@shared/schema";

import AppointmentForm from "@/components/appointments/AppointmentForm";

export default function Appointments() {
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  // Cria uma data formatada corretamente para hoje
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const [selectedType, setSelectedType] = useState<string | undefined>();
  const { toast } = useToast();
  const { user } = useAuth();

  // Tipo estendido para agendamentos com informações do paciente e profissional
  interface AppointmentWithDetails extends Appointment {
    patientName?: string;
    professionalName?: string;
    type?: string;
    procedureName?: string;
    // Adicionar campos para os objetos relacionados que vêm da API
    patient?: {
      id: number;
      name: string;
      email: string | null;
      phone: string;
      cpf: string | null;
      rg: string | null;
      profession: string | null;
      birthDate: Date;
      gender: "male" | "female" | "other";
      address: string | null;
      observations: string | null;
      createdBy: number;
    };
    professional?: {
      id: number;
      userId: number;
      specialty: string;
      commission: number;
      user?: {
        id: number;
        name: string;
        email: string;
        role: string;
      };
    };
    procedure?: {
      id: number;
      name: string;
      type: "consultation" | "exam" | "procedure";
      value: number;
      description: string | null;
    };
  };
  
  const { data: appointments, isLoading, refetch } = useQuery<AppointmentWithDetails[]>({
    queryKey: ["/api/appointments", selectedDate, selectedStatus, selectedType],
    queryFn: async () => {
      console.log("Buscando agendamentos com filtros:", { 
        date: selectedDate?.toISOString(), 
        status: selectedStatus, 
        type: selectedType
      });
      
      const params = new URLSearchParams();
      if (selectedDate) {
        params.append("date", selectedDate.toISOString());
      }
      if (selectedStatus && selectedStatus !== 'all') {
        params.append("status", selectedStatus);
      }
      if (selectedType && selectedType !== 'all') {
        params.append("type", selectedType);
      }
      // Se usuário for médico, busca o professionalId e inclui como filtro
      if (user?.role === "medico") {
        const userObj = user as any;
        if (userObj.professionalId) {
          params.append("professionalId", userObj.professionalId.toString());
        }
      }

      // Adicionar timestamp para evitar cache
      params.append("_ts", Date.now().toString());
      
      const queryString = params.toString();
      console.log(`Fazendo requisição para /api/appointments?${queryString}`);
      
      const res = await fetch(`/api/appointments?${queryString}`);
      if (!res.ok) throw new Error("Falha ao buscar agendamentos");
      const data = await res.json();
      console.log("Dados de agendamentos recebidos:", data);
      return data;
    },
    enabled: !!user,
    // Não faça cache da resposta para garantir dados atualizados
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  
  // Usar useEffect para forçar uma atualização quando o componente montar
  useEffect(() => {
    // Forçar atualização quando o componente montar
    refetch();
    
    // Configurar um intervalo para atualizar a cada 30 segundos
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [refetch]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: string;
    }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/appointments/${id}/status`,
        { status }
      );
      if (!res.ok) throw new Error("Falha ao atualizar status do agendamento");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Status atualizado",
        description: "O status do agendamento foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (id: number, status: "scheduled" | "waiting" | "in_progress" | "completed" | "cancelled") => {
    updateStatusMutation.mutate({ id, status });
  };

  const getStatusBadge = (status: "scheduled" | "waiting" | "in_progress" | "completed" | "cancelled") => {
    return <BadgeStatus status={status} />;
  };

  const getAppointmentTypeLabel = (type: string | undefined) => {
    if (!type) return "";
    const types: Record<string, string> = {
      consultation: "Consulta",
      exam: "Exame",
      procedure: "Procedimento",
    };
    return types[type] || type;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Agendamentos</h1>
          <p className="text-muted-foreground">
            Gerencie os agendamentos da clínica
          </p>
        </div>
        {(user?.role === "admin" || user?.role === "recepcionista") && (
          <Dialog open={isNewAppointmentOpen} onOpenChange={setIsNewAppointmentOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px]">
              <DialogHeader>
                <DialogTitle>Novo Agendamento</DialogTitle>
                <DialogDescription>
                  Preencha os campos abaixo para agendar um novo atendimento
                </DialogDescription>
              </DialogHeader>
              <AppointmentForm
                onSuccess={() => {
                  setIsNewAppointmentOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "PPP", { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="waiting">Em Espera</SelectItem>
                  <SelectItem value="in_progress">Em Atendimento</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="consultation">Consulta</SelectItem>
                  <SelectItem value="exam">Exame</SelectItem>
                  <SelectItem value="procedure">Procedimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8">
        {isLoading ? (
          <div>Carregando agendamentos...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Procedimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Nenhum agendamento encontrado
                  </TableCell>
                </TableRow>
              )}
              {appointments?.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>{appointment.patient?.name || appointment.patientName || "Paciente não encontrado"}</TableCell>
                  <TableCell>{appointment.professional?.user?.name || appointment.professionalName || "Profissional não encontrado"}</TableCell>
                  <TableCell>
                    {format(new Date(appointment.date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    {format(new Date(appointment.date), "HH:mm")}
                  </TableCell>
                  <TableCell>
                    {getAppointmentTypeLabel(appointment.procedure?.type || appointment.type)}
                  </TableCell>
                  <TableCell>
                    {appointment.procedures && appointment.procedures.length > 0 
                      ? appointment.procedures.map(proc => proc.name).join(", ") 
                      : appointment.procedure?.name || appointment.procedureName || "Procedimento não encontrado"}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(appointment.status)}
                  </TableCell>
                  <TableCell>
                    {/* O botão de check-in foi removido desta tela e mantido apenas na fila de espera */}
                    {(user?.role === "admin" || user?.role === "medico") && appointment.status === "waiting" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleStatusUpdate(appointment.id, "in_progress")
                        }
                      >
                        Iniciar
                      </Button>
                    )}
                    {(user?.role === "admin" || user?.role === "medico") && appointment.status === "in_progress" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleStatusUpdate(appointment.id, "completed")
                        }
                      >
                        Concluir
                      </Button>
                    )}
                    {(user?.role === "admin" || user?.role === "recepcionista") && (appointment.status === "scheduled" || appointment.status === "waiting") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() =>
                          handleStatusUpdate(appointment.id, "cancelled")
                        }
                      >
                        Cancelar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}