
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { apiRequest } from "@/lib/api";
import { useLocation } from "wouter";

export default function WaitingRoom() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();

  const { data: waitingQueue = [] } = useQuery({
    queryKey: ["/api/appointments/waiting-queue"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/appointments/waiting-queue");
      return response.json();
    },
  });

  const startAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      const response = await apiRequest("PUT", `/api/appointments/${appointmentId}/status`, {
        status: "in_progress",
      });
      return response.json();
    },
    onSuccess: (_, appointmentId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/waiting-queue"] });
      setLocation(`/medical-records?appointmentId=${appointmentId}`);
    },
  });

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Sala de Espera</h1>

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left">Horário</th>
              <th className="p-2 text-left">Paciente</th>
              <th className="p-2 text-left">Procedimento</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {waitingQueue.map((appointment: any) => (
              <tr key={appointment.id} className="border-b">
                <td className="p-2">{new Date(appointment.date).toLocaleTimeString()}</td>
                <td className="p-2">{appointment.patient.name}</td>
                <td className="p-2">{appointment.procedure.name}</td>
                <td className="p-2">{appointment.status}</td>
                <td className="p-2">
                  <Button
                    size="sm"
                    onClick={() => startAppointmentMutation.mutate(appointment.id)}
                  >
                    Iniciar Atendimento
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
