import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import QueueTable from "@/components/queue/QueueTable";

export default function QueuePage() {
  const { user } = useAuth();
  const [professionalId, setProfessionalId] = useState<number | undefined>(undefined);

  // Set professional ID if user is a professional
  useEffect(() => {
    if (user?.role === "professional" && user?.professionalId) {
      setProfessionalId(user.professionalId);
    }
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold mb-1">Fila de Espera</h1>
        <p className="text-gray-500">
          Gerencie os pacientes na fila de espera e inicie atendimentos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <QueueTable />
      </div>
    </div>
  );
}
