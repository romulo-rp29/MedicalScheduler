import React from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/contexts/auth-context";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Sidebar from "@/components/layout/sidebar";
import WaitingQueue from "@/pages/waiting-queue";
import PatientCare from "@/pages/patient-care";
import Patients from "@/pages/patients";
import PatientRegister from "@/pages/patients/register";
import PatientEdit from "@/pages/patients/edit";
import PatientView from "@/pages/patients/view";
import Appointments from "@/pages/appointments";
import NewAppointment from "@/pages/appointments/new";
import Professionals from "@/pages/professionals";
import ProfessionalRegister from "@/pages/professionals/register";
import ProfessionalEdit from "@/pages/professionals/edit";
import Procedures from "@/pages/procedures";
import ProcedureEdit from "@/pages/procedures/edit";
// Módulo financeiro temporariamente desativado
// import Financial from "@/pages/financial";
import Users from "@/pages/users";
import Profile from "@/pages/profile";
import MedicalConsultation from "@/pages/medical-consultation";
import MedicalConsultationEdit from "@/pages/medical-consultation/edit";
import MedicalRecords from "@/pages/medical-records";
import { useAuth } from "./hooks/use-auth";

// Doctor Pages
import DoctorDashboard from "@/pages/doctors/dashboard";
import DoctorConsultation from "@/pages/doctors/consultation";
import DoctorMedicalRecord from "@/pages/doctors/medical-record";
import DoctorPatientConsultation from "@/pages/doctors/patient-consultation";

function PrivateRoute({ component: Component, roles = [], ...rest }: { component: React.ComponentType<any>, roles?: string[], path: string }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <NotFound />;
  }

  return <Component />;
}

function AuthenticatedApp() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      <Sidebar />
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/dashboard">
              {() => <PrivateRoute component={Dashboard} path="/dashboard" />}
            </Route>
            <Route path="/waiting-queue">
              {() => <PrivateRoute component={WaitingQueue} path="/waiting-queue" roles={['medico', 'recepcionista']} />}
            </Route>
            <Route path="/patient-care/:id">
              {(params) => <PrivateRoute component={PatientCare} path={`/patient-care/${params.id}`} roles={['medico']} />}
            </Route>
            <Route path="/patients">
              {() => <PrivateRoute component={Patients} path="/patients" />}
            </Route>
            <Route path="/patients/register">
              {() => <PrivateRoute component={PatientRegister} path="/patients/register" roles={['admin', 'recepcionista']} />}
            </Route>
            <Route path="/patients/edit/:id">
              {(params) => <PrivateRoute component={PatientEdit} path={`/patients/edit/${params.id}`} roles={['admin', 'recepcionista']} />}
            </Route>
            <Route path="/patients/view/:id">
              {(params) => <PrivateRoute component={PatientView} path={`/patients/view/${params.id}`} />}
            </Route>
            <Route path="/appointments">
              {() => <PrivateRoute component={Appointments} path="/appointments" />}
            </Route>
            <Route path="/professionals">
              {() => <PrivateRoute component={Professionals} path="/professionals" roles={['admin']} />}
            </Route>
            <Route path="/professionals/register">
              {() => <PrivateRoute component={ProfessionalRegister} path="/professionals/register" roles={['admin']} />}
            </Route>
            <Route path="/professionals/edit/:id">
              {(params) => <PrivateRoute component={ProfessionalEdit} path={`/professionals/edit/${params.id}`} roles={['admin']} />}
            </Route>
            <Route path="/procedures">
              {() => <PrivateRoute component={Procedures} path="/procedures" roles={['admin']} />}
            </Route>
            <Route path="/procedures/edit/:id">
              {(params) => <PrivateRoute component={ProcedureEdit} path={`/procedures/edit/${params.id}`} roles={['admin']} />}
            </Route>
            {/* Módulo financeiro temporariamente desativado 
            <Route path="/financial">
              {() => <PrivateRoute component={Financial} path="/financial" roles={['admin', 'medico']} />}
            </Route>
            */}
            <Route path="/users">
              {() => <PrivateRoute component={Users} path="/users" roles={['admin']} />}
            </Route>
            <Route path="/profile">
              {() => <PrivateRoute component={Profile} path="/profile" />}
            </Route>
            <Route path="/medical-consultation">
              {() => <PrivateRoute component={MedicalConsultation} path="/medical-consultation" roles={['medico']} />}
            </Route>
            <Route path="/medical-consultation/edit">
              {() => <PrivateRoute component={MedicalConsultationEdit} path="/medical-consultation/edit" roles={['medico']} />}
            </Route>
            <Route path="/medical-records">
              {() => <PrivateRoute component={MedicalRecords} path="/medical-records" roles={['medico']} />}
            </Route>
            <Route path="/appointments/new">
              {() => <PrivateRoute component={NewAppointment} path="/appointments/new" roles={['admin', 'recepcionista']} />}
            </Route>

            {/* Doctor Routes */}
            <Route path="/doctors/dashboard">
              {() => <PrivateRoute component={DoctorDashboard} path="/doctors/dashboard" roles={['medico']} />}
            </Route>
            <Route path="/doctors/consultation/:id">
              {(params) => <PrivateRoute component={DoctorConsultation} path={`/doctors/consultation/${params.id}`} roles={['medico']} />}
            </Route>
            <Route path="/doctors/medical-record/:id">
              {(params) => <PrivateRoute component={DoctorMedicalRecord} path={`/doctors/medical-record/${params.id}`} roles={['medico']} />}
            </Route>
            <Route path="/doctors/patient/:id">
              {(params) => <PrivateRoute component={DoctorPatientConsultation} path={`/doctors/patient/${params.id}`} roles={['medico']} />}
            </Route>
            
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  return (
    <Switch>
      <Route path="/login">
        {user ? <Redirect to="/" /> : <Login />}
      </Route>
      <Route path="*">
        {user ? <AuthenticatedApp /> : <Redirect to="/login" />}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
