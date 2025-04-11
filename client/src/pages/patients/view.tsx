import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ArrowLeft, Edit, UserRound, Calendar, Phone, Mail, MapPin, ClipboardList, Briefcase, IdCard } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import { Patient } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PatientView() {
  const [_, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const patientId = parseInt(id);
  const { user } = useAuth();

  // Buscar dados do paciente
  const { data: patient, error, isLoading } = useQuery<Patient>({
    queryKey: ["/api/patients", patientId],
    queryFn: getQueryFn({ on401: 'throw' }),
    enabled: !!patientId && !isNaN(patientId),
  });

  // Função para formatar data legível
  const formatDate = (date: Date | string | null) => {
    if (!date) return "Não informado";
    
    try {
      const parsedDate = typeof date === 'string' ? new Date(date) : date;
      return format(parsedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return "Data inválida";
    }
  };

  // Função para calcular idade
  const calculateAge = (birthdate: Date | string | null) => {
    if (!birthdate) return "";
    
    try {
      const birthDate = typeof birthdate === 'string' ? new Date(birthdate) : birthdate;
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      console.error("Erro ao calcular idade:", error);
      return "";
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8 flex flex-col items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
        <p className="text-muted-foreground">Carregando informações do paciente...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="container py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1" 
            onClick={() => navigate("/patients")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Button>
          <h1 className="text-2xl font-semibold ml-4">Paciente não encontrado</h1>
        </div>
        
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-4">
              Não foi possível encontrar o paciente solicitado.
            </p>
            <Button onClick={() => navigate("/patients")}>
              Voltar para lista de pacientes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1" 
            onClick={() => navigate("/patients")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Button>
          <h1 className="text-2xl font-semibold ml-4">Detalhes do Paciente</h1>
        </div>
        
        {(user?.role === 'admin' || user?.role === 'recepcionista') && (
          <Button 
            onClick={() => navigate(`/patients/edit/${patient.id}`)} 
            variant="outline"
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Editar Paciente
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserRound className="mr-2 h-5 w-5" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Nome Completo</h3>
                <p className="mt-1 text-lg">{patient.name}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Data de Nascimento</h3>
                <p className="mt-1">
                  {formatDate(patient.birthDate)}
                  {calculateAge(patient.birthDate) && (
                    <span className="text-muted-foreground ml-2">
                      ({calculateAge(patient.birthDate)} anos)
                    </span>
                  )}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Gênero</h3>
                <p className="mt-1">
                  {patient.gender === 'male' ? 'Masculino' : 
                   patient.gender === 'female' ? 'Feminino' : 'Outro'}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Profissão</h3>
                <p className="mt-1">{patient.profession || 'Não informado'}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">CPF</h3>
                <p className="mt-1">{patient.cpf || 'Não informado'}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">RG</h3>
                <p className="mt-1">{patient.rg || 'Não informado'}</p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Contato</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{patient.phone}</span>
                </div>
                
                {patient.email && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{patient.email}</span>
                  </div>
                )}
              </div>
            </div>
            
            {patient.address && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Endereço</h3>
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground mt-0.5" />
                    <span>{patient.address}</span>
                  </div>
                </div>
              </>
            )}
            
            {patient.observations && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Observações</h3>
                  <div className="flex items-start">
                    <ClipboardList className="h-4 w-4 mr-2 text-muted-foreground mt-0.5" />
                    <p className="whitespace-pre-line">{patient.observations}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base">
                <Calendar className="mr-2 h-4 w-4" />
                Informações Adicionais
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div>
                <h3 className="text-xs font-medium text-muted-foreground">Registrado por</h3>
                <p className="mt-1">{patient.createdBy ? `ID: ${patient.createdBy}` : 'Sistema'}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base">
                <Briefcase className="mr-2 h-4 w-4" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate("/appointments/new")}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Agendar Consulta
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate(`/evolutions/${patient.id}`)}
              >
                <ClipboardList className="mr-2 h-4 w-4" />
                Ver Histórico Médico
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}