import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Search, 
  UserPlus, 
  PercentCircle,
  Mail,
  Stethoscope
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function Professionals() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch professionals data
  const { data: professionals = [], isLoading } = useQuery({
    queryKey: ['/api/professionals'],
  });
  
  // Filter professionals based on search term
  const filteredProfessionals = professionals.filter((professional: any) => {
    const userName = professional.user?.name || '';
    const userEmail = professional.user?.email || '';
    const specialty = professional.specialty || '';
    
    return userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
           specialty.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Profissionais</h1>
            <p className="mt-1 text-sm text-gray-500">
              {professionals.length} profissionais cadastrados
            </p>
          </div>
          {user?.role === 'admin' && (
            <Button asChild>
              <Link href="/professionals/register">
                <UserPlus className="mr-2 h-4 w-4" />
                Cadastrar Profissional
              </Link>
            </Button>
          )}
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Lista de Profissionais</CardTitle>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Buscar profissionais..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <CardDescription>
              Gerencie os profissionais da clínica
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : filteredProfessionals.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Especialidade</TableHead>
                    <TableHead>Comissão</TableHead>
                    {user?.role === 'admin' && (
                      <TableHead className="text-right">Ações</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfessionals.map((professional: any) => (
                    <TableRow key={professional.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src="" alt={professional.user?.name || ''} />
                            <AvatarFallback>
                              {professional.user?.name?.charAt(0) || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          {professional.user?.name || `Profissional ${professional.id}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-gray-500">
                          <Mail className="h-3 w-3 mr-1" />
                          {professional.user?.email || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Stethoscope className="h-4 w-4 mr-1 text-gray-500" />
                          {professional.specialty || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <PercentCircle className="h-4 w-4 mr-1 text-gray-500" />
                          {professional.commission 
                            ? `${(professional.commission * 100).toFixed(0)}%` 
                            : 'N/A'}
                        </div>
                      </TableCell>
                      {user?.role === 'admin' && (
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/professionals/edit/${professional.id}`}>
                              Editar
                            </Link>
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhum profissional encontrado.</p>
              </div>
            )}
          </CardContent>
          {filteredProfessionals.length > 0 && (
            <CardFooter className="flex justify-between border-t px-6 py-4">
              <div className="text-sm text-gray-500">
                Mostrando {filteredProfessionals.length} de {professionals.length} profissionais
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
