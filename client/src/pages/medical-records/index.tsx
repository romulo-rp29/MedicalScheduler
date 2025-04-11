import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  User, ClipboardList, Calendar, Search, FileText, 
  Users, Activity, Stethoscope, ChevronRight, 
  Clock
} from "lucide-react";

export default function MedicalRecords() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  // Obter a lista de pacientes
  const { data: patients = [], isLoading: isLoadingPatients } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/patients");
      return await res.json();
    }
  });
  
  // Buscar evoluções do paciente selecionado
  const { data: patientEvolutions = [], isLoading: isLoadingEvolutions } = useQuery({
    queryKey: ["/api/evolutions/patient", selectedPatientId],
    queryFn: async () => {
      if (!selectedPatientId) return [];
      const res = await apiRequest("GET", `/api/evolutions/patient/${selectedPatientId}`);
      return await res.json();
    },
    enabled: !!selectedPatientId
  });
  
  // Buscar detalhes do paciente selecionado
  const { data: selectedPatient, isLoading: isLoadingPatientDetails } = useQuery({
    queryKey: ["/api/patients", selectedPatientId],
    queryFn: async () => {
      if (!selectedPatientId) return null;
      const res = await apiRequest("GET", `/api/patients/${selectedPatientId}`);
      return await res.json();
    },
    enabled: !!selectedPatientId
  });

  // Filtrar pacientes com base no termo de pesquisa
  const filteredPatients = patients.filter((patient: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      patient.name.toLowerCase().includes(searchLower) ||
      (patient.cpf && patient.cpf.toLowerCase().includes(searchLower)) ||
      (patient.phone && patient.phone.toLowerCase().includes(searchLower))
    );
  });

  // Agrupar evoluções por data (agrupando por mês/ano)
  const groupedEvolutions = patientEvolutions.reduce((acc: any, evolution: any) => {
    const date = new Date(evolution.createdAt);
    const monthYear = format(date, "MMMM yyyy", { locale: ptBR });
    
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    
    acc[monthYear].push(evolution);
    return acc;
  }, {});

  // Função para calcular a idade a partir da data de nascimento
  const calculateAge = (birthDate: string | Date) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
  };

  // Função para visualizar detalhes do atendimento
  const viewAppointmentDetails = (appointmentId: number) => {
    navigate(`/medical-consultation?appointmentId=${appointmentId}`);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Prontuários Médicos</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel esquerdo - Lista de pacientes */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Pacientes
              </CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar paciente..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoadingPatients ? (
                <div className="py-4 text-center text-sm text-gray-500">
                  Carregando pacientes...
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="py-4 text-center text-sm text-gray-500">
                  Nenhum paciente encontrado
                </div>
              ) : (
                <div className="space-y-1 max-h-[500px] overflow-y-auto">
                  {filteredPatients.map((patient: any) => (
                    <div
                      key={patient.id}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-gray-100 
                                ${selectedPatientId === patient.id ? 'bg-gray-100 border-l-4 border-primary' : ''}`}
                      onClick={() => setSelectedPatientId(patient.id)}
                    >
                      <div className="flex items-center">
                        <User className="h-5 w-5 mr-2 text-gray-500" />
                        <div>
                          <div className="font-medium">{patient.name}</div>
                          <div className="text-xs text-gray-500">
                            {patient.birthDate ? (
                              <span>{calculateAge(patient.birthDate)} anos</span>
                            ) : (
                              <span>Idade desconhecida</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Painel direito - Detalhes do prontuário */}
        <div className="lg:col-span-2">
          {selectedPatientId ? (
            <div className="space-y-6">
              {/* Informações do paciente */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    Detalhes do Paciente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingPatientDetails ? (
                    <div className="py-4 text-sm text-gray-500">
                      Carregando detalhes do paciente...
                    </div>
                  ) : selectedPatient ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome Completo
                        </label>
                        <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                          {selectedPatient.name}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data de Nascimento
                        </label>
                        <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                          {selectedPatient.birthDate ? (
                            format(new Date(selectedPatient.birthDate), "dd/MM/yyyy", { locale: ptBR })
                          ) : (
                            "Não informado"
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CPF
                        </label>
                        <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                          {selectedPatient.cpf || "Não informado"}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contato
                        </label>
                        <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                          {selectedPatient.phone || "Não informado"}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Gênero
                        </label>
                        <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                          {selectedPatient.gender === "male" ? "Masculino" : 
                          selectedPatient.gender === "female" ? "Feminino" : 
                          selectedPatient.gender === "other" ? "Outro" : "Não informado"}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Profissão
                        </label>
                        <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                          {selectedPatient.profession || "Não informado"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-sm text-gray-500">
                      Erro ao carregar detalhes do paciente
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Histórico de atendimentos */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <ClipboardList className="mr-2 h-5 w-5" />
                    Histórico de Atendimentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingEvolutions ? (
                    <div className="py-4 text-sm text-gray-500">
                      Carregando histórico...
                    </div>
                  ) : patientEvolutions.length === 0 ? (
                    <div className="py-4 text-sm text-gray-500">
                      Este paciente não possui histórico de atendimentos.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(groupedEvolutions).map(([monthYear, evolutions]: [string, any]) => (
                        <div key={monthYear} className="space-y-3">
                          <h3 className="text-md font-medium capitalize">{monthYear}</h3>
                          <div className="space-y-3">
                            {evolutions.map((evolution: any) => (
                              <div key={evolution.id} className="border rounded-md p-4 hover:shadow-sm transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="space-y-1">
                                    <div className="font-medium">
                                      {evolution.appointment?.procedure?.name || "Consulta Médica"}
                                    </div>
                                    <div className="text-sm text-gray-500 flex items-center">
                                      <Calendar className="h-4 w-4 mr-1" />
                                      {format(new Date(evolution.createdAt), "dd MMM yyyy", { locale: ptBR })}
                                      <span className="mx-1">•</span>
                                      <Clock className="h-4 w-4 mr-1" />
                                      {format(new Date(evolution.createdAt), "HH:mm", { locale: ptBR })}
                                    </div>
                                  </div>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => viewAppointmentDetails(evolution.appointmentId)}
                                  >
                                    Ver detalhes
                                  </Button>
                                </div>
                                
                                <Separator className="my-2" />
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                  {evolution.symptoms && (
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-700">Sintomas</h4>
                                      <p className="text-sm text-gray-600 mt-1">{evolution.symptoms}</p>
                                    </div>
                                  )}
                                  {evolution.diagnosis && (
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-700">Diagnóstico</h4>
                                      <p className="text-sm text-gray-600 mt-1">{evolution.diagnosis}</p>
                                    </div>
                                  )}
                                </div>
                                
                                {evolution.notes && (
                                  <div className="mt-3">
                                    <h4 className="text-sm font-medium text-gray-700">Observações</h4>
                                    <p className="text-sm text-gray-600 mt-1">{evolution.notes}</p>
                                  </div>
                                )}
                                
                                <div className="mt-3 flex items-center text-sm text-gray-500">
                                  <Stethoscope className="h-4 w-4 mr-1" />
                                  <span>Dr. {evolution.professional?.user?.name || "Não informado"}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-700">Nenhum paciente selecionado</h3>
                <p className="text-gray-500 text-center mt-2">
                  Selecione um paciente na lista para visualizar seu prontuário médico.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}