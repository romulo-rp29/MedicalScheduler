import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  User, 
  Search, 
  Phone, 
  Calendar, 
  UserPlus, 
  FileEdit,
  Eye
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Patients() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Fetch patients data
  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['/api/patients'],
  });
  
  // Filter patients based on search term
  const filteredPatients = Array.isArray(patients) ? patients.filter((patient: any) => 
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];
  
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Pacientes</h1>
            <p className="mt-1 text-sm text-gray-500">
              {Array.isArray(patients) ? patients.length : 0} pacientes cadastrados
            </p>
          </div>
          {(user?.role === 'admin' || user?.role === 'recepcionista') && (
            <Button asChild>
              <Link href="/patients/register">
                <UserPlus className="mr-2 h-4 w-4" />
                Cadastrar Paciente
              </Link>
            </Button>
          )}
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Lista de Pacientes</CardTitle>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Buscar pacientes..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <CardDescription>
              Gerencie os pacientes da clínica
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : filteredPatients.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Data de Nascimento</TableHead>
                    <TableHead>Gênero</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient: any) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src="" alt={patient.name} />
                            <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          {patient.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {patient.email && (
                            <span className="text-sm text-gray-500 flex items-center">
                              <User className="h-3 w-3 mr-1" /> {patient.email}
                            </span>
                          )}
                          <span className="text-sm text-gray-500 flex items-center">
                            <Phone className="h-3 w-3 mr-1" /> {patient.phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center text-sm">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(patient.birthDate).toLocaleDateString()}
                          {` (${calculateAge(patient.birthDate)} anos)`}
                        </span>
                      </TableCell>
                      <TableCell>
                        {patient.gender === 'male' ? 'Masculino' : 
                         patient.gender === 'female' ? 'Feminino' : 'Outro'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <Button variant="outline" size="sm" className="mr-2" onClick={() => navigate(`/patients/view/${patient.id}`)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Visualizar
                          </Button>
                          {(user?.role === 'admin' || user?.role === 'recepcionista') && (
                            <Button variant="outline" size="sm" onClick={() => navigate(`/patients/edit/${patient.id}`)}>
                              <FileEdit className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhum paciente encontrado.</p>
              </div>
            )}
          </CardContent>
          {filteredPatients.length > 0 && (
            <CardFooter className="flex justify-between border-t px-6 py-4">
              <div className="text-sm text-gray-500">
                Mostrando {filteredPatients.length} de {Array.isArray(patients) ? patients.length : 0} pacientes
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}

// Utility function to calculate age from birthdate
function calculateAge(birthdate: string) {
  const today = new Date();
  const birthDate = new Date(birthdate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
