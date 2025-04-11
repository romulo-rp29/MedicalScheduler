import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import Calendar from "@/components/appointments/Calendar";
import AppointmentForm from "@/components/appointments/AppointmentForm";
import { useAuth } from "@/hooks/use-auth";

export default function NewAppointmentPage() {
  const [_, params] = useLocation();
  const searchParams = new URLSearchParams(params);
  const patientId = searchParams.get("patientId");
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | undefined>(
    user?.role === "professional" && user?.professionalId 
      ? user.professionalId 
      : undefined
  );

  // Set professional ID if user is a professional
  useEffect(() => {
    if (user?.role === "professional" && user?.professionalId) {
      setSelectedProfessionalId(user.professionalId);
    }
  }, [user]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" asChild className="mr-2">
          <Link href="/appointments">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Novo Agendamento</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Calendar 
            onDateSelect={handleDateSelect} 
            professionalId={selectedProfessionalId}
          />
        </div>
        
        {/* Appointment Form */}
        <div>
          <AppointmentForm />
        </div>
      </div>
    </div>
  );
}
