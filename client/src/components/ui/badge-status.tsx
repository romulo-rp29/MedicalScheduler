import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeStatusProps {
  status: 'scheduled' | 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  className?: string;
}

export function BadgeStatus({ status, className }: BadgeStatusProps) {
  const statusStyles = {
    scheduled: "bg-gray-100 text-gray-800",
    waiting: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const statusLabels = {
    scheduled: "Agendado",
    waiting: "Aguardando",
    in_progress: "Em Atendimento",
    completed: "Finalizado",
    cancelled: "Cancelado",
  };

  return (
    <span className={cn(
      "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
      statusStyles[status],
      className
    )}>
      {statusLabels[status]}
    </span>
  );
}

export default BadgeStatus;
