import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { Calendar, Clock, Users, CreditCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Appointment, Patient } from '@shared/schema';

export default function Dashboard() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  
  // Get appointments for today
  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments', { date: today }],
  });
  
  // Buscar todos os pacientes
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
  });
  
  // Módulo financeiro temporariamente desativado
  /*
  // Get financial data for today (if professional)
  const { data: financialData } = useQuery({
    queryKey: ['/api/financial-records/professional', user?.id, { date: today }],
    enabled: user?.role === 'medico',
  });
  */
  // Dados financeiros temporários vazios
  const financialData = [];
  
  // Sample chart data - in a real app, this would come from the API
  const chartData = [
    { name: 'Jan', value: 4000 },
    { name: 'Fev', value: 3000 },
    { name: 'Mar', value: 2000 },
    { name: 'Abr', value: 2780 },
    { name: 'Mai', value: 1890 },
    { name: 'Jun', value: 2390 },
  ];
  
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bem-vindo(a), {user?.name}
        </p>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        {/* Stats cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:max-w-3xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Agendamentos Hoje</p>
                  <p className="text-3xl font-bold mt-1">{appointments.length || 0}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Em Espera</p>
                  <p className="text-3xl font-bold mt-1">
                    {appointments.filter((a: Appointment) => a.status === 'waiting').length || 0}
                  </p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Pacientes</p>
                  <p className="text-3xl font-bold mt-1">{patients.length || 0}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Agendamentos */}
        <div className="mt-8 md:max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Próximos Agendamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {appointments.length > 0 ? (
                  appointments.slice(0, 5).map((appointment: any) => (
                    <div key={appointment.id} className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center">
                        <div className="ml-3">
                          <p className="text-sm font-medium">{appointment.patient?.name || appointment.patientName || 'Paciente'}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(appointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {appointment.procedure?.name || 'Consulta'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${appointment.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' : 
                            appointment.status === 'in_progress' ? 'bg-green-100 text-green-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                          {appointment.status === 'waiting' ? 'Aguardando' : 
                           appointment.status === 'in_progress' ? 'Em Atendimento' : 
                           appointment.status === 'completed' ? 'Finalizado' : 
                           appointment.status === 'cancelled' ? 'Cancelado' : 'Agendado'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Nenhum agendamento para hoje.</p>
                )}
                
                <div className="pt-2">
                  <Link href="/appointments" className="text-sm text-primary hover:text-primary/80">
                    Ver todos os agendamentos →
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Quick access buttons */}
        {user?.role === 'medico' && (
          <div className="mt-8 md:max-w-3xl mx-auto">
            <h2 className="text-lg font-medium mb-4">Acesso Rápido</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Link href="/waiting-queue" className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="ml-3 text-lg font-medium">Fila de Espera</h3>
                </div>
                <p className="mt-2 text-sm text-gray-500">Gerencie pacientes aguardando atendimento</p>
              </Link>
              
              <Link href="/appointments" className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="ml-3 text-lg font-medium">Minha Agenda</h3>
                </div>
                <p className="mt-2 text-sm text-gray-500">Visualize e gerencie seus agendamentos</p>
              </Link>
              
              <div className="bg-white shadow rounded-lg p-6 border-dashed border border-gray-300">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <CreditCard className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="ml-3 text-lg font-medium">Financeiro</h3>
                  <Badge variant="outline" className="ml-2 text-amber-600 border-amber-600">Em breve</Badge>
                </div>
                <p className="mt-2 text-sm text-gray-500">Módulo financeiro será disponibilizado em breve</p>
              </div>
            </div>
          </div>
        )}
        
        {user?.role === 'recepcionista' && (
          <div className="mt-8 md:max-w-3xl mx-auto">
            <h2 className="text-lg font-medium mb-4">Acesso Rápido</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Link href="/appointments" className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="ml-3 text-lg font-medium">Agendamentos</h3>
                </div>
                <p className="mt-2 text-sm text-gray-500">Gerencie os agendamentos da clínica</p>
              </Link>
              
              <Link href="/patients/register" className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="ml-3 text-lg font-medium">Cadastrar Paciente</h3>
                </div>
                <p className="mt-2 text-sm text-gray-500">Adicione novos pacientes ao sistema</p>
              </Link>
              
              <Link href="/waiting-queue" className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <h3 className="ml-3 text-lg font-medium">Fila de Espera</h3>
                </div>
                <p className="mt-2 text-sm text-gray-500">Gerencie a fila de pacientes</p>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
