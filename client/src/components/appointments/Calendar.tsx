import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addDays,
  parseISO,
  isToday
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CalendarProps {
  onDateSelect: (date: Date) => void;
  professionalId?: number;
}

export default function Calendar({ onDateSelect, professionalId }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const { data: appointments = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: [
      "/api/appointments",
      {
        professionalId,
        startDate: format(startOfMonth(currentMonth), "yyyy-MM-dd"),
        endDate: format(endOfMonth(currentMonth), "yyyy-MM-dd"),
        timestamp: Date.now() // Adicionar timestamp para evitar cache
      }
    ],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      const { professionalId, startDate, endDate } = queryKey[1] as any;
      
      const params = new URLSearchParams();
      params.append("startDate", startDate);
      params.append("endDate", endDate);
      if (professionalId) {
        params.append("professionalId", professionalId.toString());
      }
      // Adicionar timestamp para evitar cache
      params.append("_ts", Date.now().toString());
      
      console.log(`Buscando agendamentos para o calendário: ${params.toString()}`);
      
      const res = await fetch(`/api/appointments?${params.toString()}`);
      if (!res.ok) throw new Error("Falha ao buscar agendamentos");
      const data = await res.json();
      console.log("Dados de agendamentos para calendário:", data);
      return data;
    },
    staleTime: 0, // Não armazene em cache
    refetchOnWindowFocus: true,
    enabled: true,
  });
  
  // Usar useEffect para atualizar dados quando o mês mudar
  useEffect(() => {
    refetch();
  }, [currentMonth, refetch]);
  
  // Atualizar periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000); // Atualizar a cada 30 segundos
    
    return () => clearInterval(interval);
  }, [refetch]);

  // Group appointments by date
  const appointmentsByDate = appointments.reduce((acc: Record<string, any[]>, appointment: any) => {
    const dateStr = format(parseISO(appointment.date), "yyyy-MM-dd");
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(appointment);
    return acc;
  }, {} as Record<string, any[]>);

  const getAppointmentStatusColor = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dateAppointments = appointmentsByDate[dateStr] || [];
    
    if (dateAppointments.length === 0) return "";
    
    if (dateAppointments.length > 5) return "bg-red-500";
    if (dateAppointments.length > 3) return "bg-blue-500";
    return "bg-green-500";
  };

  const getAppointmentsCount = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return appointmentsByDate[dateStr]?.length || 0;
  };

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const onDateClick = (day: Date) => {
    setSelectedDate(day);
    onDateSelect(day);
  };

  const renderHeader = () => {
    return (
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-medium">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</h3>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

    return (
      <div className="grid grid-cols-7 text-center p-2 border-b border-gray-200 bg-gray-50">
        {days.map((day, index) => (
          <div key={index} className="text-xs font-medium text-gray-500 py-1">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];

    let days = eachDayOfInterval({
      start: startDate,
      end: endDate
    });

    let formattedDays = [];

    for (let day of days) {
      formattedDays.push(
        <div
          key={day.toString()}
          className={cn(
            "aspect-square flex flex-col items-center justify-start p-1 bg-white cursor-pointer hover:bg-gray-50",
            !isSameMonth(day, monthStart) && "text-gray-400",
            isSameDay(day, selectedDate) && "bg-primary-100",
            isToday(day) && "font-bold"
          )}
          onClick={() => isSameMonth(day, monthStart) && onDateClick(day)}
        >
          <span className="text-xs sm:text-sm">{format(day, dateFormat)}</span>
          {isSameMonth(day, monthStart) && getAppointmentsCount(day) > 0 && (
            <div className="mt-auto w-full">
              <div 
                className={`h-1 w-full ${getAppointmentStatusColor(day)} rounded-full mt-1`} 
                title={`${getAppointmentsCount(day)} agendamentos`}
              ></div>
            </div>
          )}
        </div>
      );
    }

    // Create 7 columns per row
    const totalRows = Math.ceil(formattedDays.length / 7);
    for (let i = 0; i < totalRows; i++) {
      rows.push(
        <div key={i} className="grid grid-cols-7 gap-px bg-gray-200">
          {formattedDays.slice(i * 7, (i + 1) * 7)}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-px bg-gray-200 p-2">
        {rows}
      </div>
    );
  };

  const renderTimeSlots = () => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const dateAppointments = appointmentsByDate[dateStr] || [];
    
    // Create available time slots
    const timeSlots = [];
    const startHour = 8;
    const endHour = 18;
    const interval = 30; // 30 minutes

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        const isBooked = dateAppointments.some((appointment: any) => {
          const appointmentTime = format(parseISO(appointment.date), "HH:mm");
          return appointmentTime === timeStr;
        });
        
        timeSlots.push({
          time: timeStr,
          isBooked
        });
      }
    }

    return (
      <div className="p-4 border-t border-gray-200">
        <h3 className="font-medium mb-3">Horários - {format(selectedDate, "dd/MM/yyyy")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {timeSlots.map((slot, index) => (
            <Button
              key={index}
              variant={slot.isBooked ? "secondary" : "outline"}
              className={cn(
                "border border-gray-300 rounded p-2 text-sm text-center",
                slot.isBooked && "bg-primary-100 text-primary-700 font-medium"
              )}
              disabled={slot.isBooked}
              onClick={() => {
                const [hours, minutes] = slot.time.split(":").map(Number);
                const dateWithTime = new Date(selectedDate);
                dateWithTime.setHours(hours, minutes, 0, 0);
                onDateSelect(dateWithTime);
              }}
            >
              {slot.time}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
      {renderTimeSlots()}
    </div>
  );
}
