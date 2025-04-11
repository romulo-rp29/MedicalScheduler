import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, insertUserSchema, insertProfessionalSchema, insertPatientSchema, 
  patientFormSchema, insertProcedureSchema, insertAppointmentSchema, appointmentFormSchema,
  insertEvolutionSchema, insertFinancialRecordSchema, User } from "@shared/schema";
import bcrypt from "bcryptjs";
import session from "express-session";
import createMemoryStore from "memorystore";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    userRole?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const MemoryStore = createMemoryStore(session);
  
  // Configure express-session
  app.use(session({
    secret: process.env.SESSION_SECRET || "clinica-medica-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 1 day
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    })
  }));

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local strategy for passport
  passport.use(new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) return done(null, false, { message: 'Email não encontrado' });
        if (!user.isActive) return done(null, false, { message: 'Usuário inativo' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return done(null, false, { message: 'Senha incorreta' });
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: 'Não autorizado' });
  };

  // Middleware to check if user has specific role
  const hasRole = (roles: string[]) => {
    return (req: Request, res: Response, next: Function) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Não autorizado' });
      }
      const user = req.user as any;
      if (roles.includes(user.role)) {
        return next();
      }
      res.status(403).json({ message: 'Acesso negado' });
    };
  };

  // Auth routes
  app.post('/api/auth/register', async (req, res, next) => {
    try {
      console.log("Registrando novo usuário:", req.body);
      const userData = insertUserSchema.parse(req.body);
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email já cadastrado' });
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      // Create user with hashed password
      const userToCreate = {
        ...userData,
        password: hashedPassword,
        isActive: true
      };
      
      const newUser = await storage.createUser(userToCreate);
      console.log("Usuário criado:", newUser);
      
      // Auto login after registration
      req.login(newUser, (err) => {
        if (err) return next(err);
        
        const { password, ...userWithoutPassword } = newUser;
        req.session.userId = newUser.id;
        req.session.userRole = newUser.role;
        
        return res.status(200).json({
          user: userWithoutPassword
        });
      });
    } catch (error) {
      console.error("Erro ao registrar usuário:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      next(error);
    }
  });

  app.post('/api/auth/login', (req, res, next) => {
    try {
      const data = loginSchema.parse(req.body);
      console.log("Tentativa de login:", data);
      
      passport.authenticate('local', (err: any, user: any, info: any) => {
        if (err) return next(err);
        if (!user) return res.status(401).json({ message: info.message });
        
        console.log("Usuário autenticado:", user);
        
        req.logIn(user, (err) => {
          if (err) return next(err);
          
          // Don't send password in response
          const { password, ...userWithoutPassword } = user;
          req.session.userId = user.id;
          req.session.userRole = user.role;
          
          console.log("Login bem sucedido, session:", req.session);
          
          return res.status(200).json({
            user: userWithoutPassword
          });
        });
      })(req, res, next);
    } catch (error) {
      console.error("Erro no login:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      next(error);
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Erro ao fazer logout' });
      }
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: 'Erro ao destruir sessão' });
        }
        res.status(200).json({ message: 'Logout bem-sucedido' });
      });
    });
  });

  app.get('/api/auth/current-user', isAuthenticated, (req, res) => {
    const user = req.user as any;
    const { password, ...userWithoutPassword } = user;
    res.status(200).json({ user: userWithoutPassword });
  });
  
  // Rota para atualizar o perfil do usuário
  app.put('/api/profile', isAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as User).id;
      if (!userId) {
        return res.status(401).json({ message: 'Não autorizado' });
      }
      
      // Buscar usuário atual para verificação
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      
      // Não permitir alterar o papel do usuário através desta rota
      if (req.body.role && req.body.role !== currentUser.role) {
        return res.status(403).json({ message: 'Não é permitido alterar o papel do usuário' });
      }
      
      // Atualizar o usuário
      const updatedUser = await storage.updateUser(userId, req.body);
      if (!updatedUser) {
        return res.status(404).json({ message: 'Falha ao atualizar o usuário' });
      }
      
      // Remover a senha antes de retornar
      const { password: _, ...userWithoutPassword } = updatedUser;
      
      res.json({ user: userWithoutPassword });
    } catch (error) {
      next(error);
    }
  });

  // User routes
  app.get('/api/users', isAuthenticated, hasRole(['admin']), async (req, res, next) => {
    try {
      // In a real app, we'd get all users from the database
      // For now, use getMethods to simulate this
      const admins = Array.from((storage as any).users.values())
        .filter((user: any) => user.isActive)
        .map(({ password, ...user }: any) => user);
      
      res.status(200).json(admins);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/users', isAuthenticated, hasRole(['admin']), async (req, res, next) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email já cadastrado' });
      }
      
      const newUser = await storage.createUser(userData);
      const { password, ...userWithoutPassword } = newUser;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      next(error);
    }
  });

  // Professional routes
  app.get('/api/professionals/:id', isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID de profissional inválido' });
      }
      
      const professional = await storage.getProfessional(id);
      if (!professional) {
        return res.status(404).json({ message: 'Profissional não encontrado' });
      }
      
      // Também busca informações do usuário associado
      const user = await storage.getUser(professional.userId);
      
      res.status(200).json({
        professional,
        user: user ? { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          role: user.role 
        } : null
      });
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/professionals/:id', isAuthenticated, hasRole(['admin']), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID de profissional inválido' });
      }
      
      const professionalData = req.body.professional;
      const userData = req.body.user;
      
      // Verifica se o profissional existe
      const existingProfessional = await storage.getProfessional(id);
      if (!existingProfessional) {
        return res.status(404).json({ message: 'Profissional não encontrado' });
      }
      
      // Se dados do usuário forem fornecidos, atualiza o usuário
      if (userData && Object.keys(userData).length > 0) {
        // Verifica se o e-mail está sendo alterado e se já está em uso
        if (userData.email) {
          const existingUserWithEmail = await storage.getUserByEmail(userData.email);
          if (existingUserWithEmail && existingUserWithEmail.id !== existingProfessional.userId) {
            return res.status(400).json({ message: "Este e-mail já está em uso" });
          }
        }
        
        // Atualiza os dados do usuário, garantindo que o papel continue sendo médico
        await storage.updateUser(existingProfessional.userId, {
          ...userData,
          role: 'medico'  // Garante que o papel continue sendo médico
        });
      }
      
      // Atualiza os dados do profissional
      if (professionalData && Object.keys(professionalData).length > 0) {
        await storage.updateProfessional(id, professionalData);
      }
      
      // Busca os dados atualizados para retornar
      const updatedProfessional = await storage.getProfessional(id);
      const updatedUser = await storage.getUser(updatedProfessional!.userId);
      
      res.status(200).json({
        professional: updatedProfessional,
        user: updatedUser ? { 
          id: updatedUser.id, 
          name: updatedUser.name, 
          email: updatedUser.email, 
          role: updatedUser.role 
        } : null
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/professionals', isAuthenticated, async (req, res, next) => {
    try {
      const professionals = await storage.getAllProfessionals();
      
      // Get user details for each professional
      const professionalDetails = await Promise.all(
        professionals.map(async (professional) => {
          const user = await storage.getUser(professional.userId);
          return {
            ...professional,
            user: user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null
          };
        })
      );
      
      res.status(200).json(professionalDetails);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/professionals/user/:userId', isAuthenticated, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'ID de usuário inválido' });
      }
      
      const professional = await storage.getProfessionalByUserId(userId);
      if (!professional) {
        return res.status(404).json({ message: 'Profissional não encontrado' });
      }
      
      // Obter detalhes do usuário
      const user = await storage.getUser(professional.userId);
      let userDetails = null;
      if (user) {
        userDetails = { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          role: user.role 
        };
      }
      
      res.status(200).json({
        ...professional,
        user: userDetails
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/professionals', isAuthenticated, hasRole(['admin']), async (req, res, next) => {
    try {
      const professionalData = insertProfessionalSchema.parse(req.body);
      
      // Verify that the userId exists and is a professional
      const user = await storage.getUser(professionalData.userId);
      if (!user) {
        return res.status(400).json({ message: 'Usuário não encontrado' });
      }
      if (user.role !== 'medico') {
        return res.status(400).json({ message: 'Usuário não é um médico' });
      }
      
      const newProfessional = await storage.createProfessional(professionalData);
      
      res.status(201).json(newProfessional);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      next(error);
    }
  });

  // Patient routes
  app.get('/api/patients', isAuthenticated, async (req, res, next) => {
    try {
      const patients = await storage.getAllPatients();
      res.status(200).json(patients);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/patients/:id', isAuthenticated, async (req, res, next) => {
    try {
      const patientId = parseInt(req.params.id);
      if (isNaN(patientId)) {
        return res.status(400).json({ message: 'ID de paciente inválido' });
      }
      
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: 'Paciente não encontrado' });
      }
      
      res.status(200).json(patient);
    } catch (error) {
      next(error);
    }
  });

  // Rota para criar paciente rápido com apenas nome
  app.post('/api/patients/quick', isAuthenticated, hasRole(['admin', 'recepcionista']), async (req, res, next) => {
    try {
      const user = req.user as any;
      console.log("Recebendo cadastro rápido de paciente:", req.body);
      
      if (!req.body.name || req.body.name.trim().length < 3) {
        return res.status(400).json({ message: "Nome do paciente é obrigatório e deve ter pelo menos 3 caracteres" });
      }
      
      // Dados mínimos para o cadastro rápido com tipos corretos
      const quickPatientData = {
        name: req.body.name,
        phone: req.body.phone || "A preencher", // Temporário
        gender: "other" as "male" | "female" | "other", // Valor padrão temporário, tipagem correta
        birthDate: new Date(), // Valor padrão temporário
        email: null,
        cpf: null,
        rg: null,
        profession: null,
        address: null,
        observations: "Cadastro rápido - Completar no check-in",
        createdBy: user.id,
        needsCompletion: true // Flag para indicar que é um cadastro rápido que precisa ser completado
      };
      
      console.log("Dados de paciente rápido:", quickPatientData);
      
      const newPatient = await storage.createPatient(quickPatientData);
      console.log("Paciente rápido criado:", newPatient);
      
      res.status(201).json(newPatient);
    } catch (error) {
      console.error("Erro ao cadastrar paciente rápido:", error);
      next(error);
    }
  });

  app.post('/api/patients', isAuthenticated, hasRole(['admin', 'recepcionista']), async (req, res, next) => {
    try {
      const user = req.user as any;
      console.log("Recebendo cadastro de paciente:", req.body);
      
      // Aqui garantimos que o createdBy está sempre presente
      const dataWithUser = {
        ...req.body,
        createdBy: user.id
      };
      
      console.log("Dados com usuário:", dataWithUser);
      
      console.log("Processando dados para validação...");
      
      // Verificar se birthDate já é uma data ou uma string
      let dataToValidate = { ...dataWithUser };
      if (typeof dataWithUser.birthDate === 'string') {
        try {
          dataToValidate.birthDate = new Date(dataWithUser.birthDate);
        } catch (e) {
          console.error("Erro ao converter data:", e);
        }
      }
      
      // Usar patientFormSchema que já tem o preprocessor para converter a string para Date
      const patientData = patientFormSchema.parse(dataToValidate);
      console.log("Dados validados:", patientData);
      
      const newPatient = await storage.createPatient(patientData);
      console.log("Paciente criado:", newPatient);
      
      res.status(201).json(newPatient);
    } catch (error) {
      console.error("Erro ao cadastrar paciente:", error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        console.error("Erro de validação:", validationError.message);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.put('/api/patients/:id', isAuthenticated, hasRole(['admin', 'recepcionista']), async (req, res, next) => {
    try {
      const patientId = parseInt(req.params.id);
      if (isNaN(patientId)) {
        return res.status(400).json({ message: 'ID de paciente inválido' });
      }
      
      const patientData = patientFormSchema.partial().parse(req.body);
      const updatedPatient = await storage.updatePatient(patientId, patientData);
      
      if (!updatedPatient) {
        return res.status(404).json({ message: 'Paciente não encontrado' });
      }
      
      res.status(200).json(updatedPatient);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      next(error);
    }
  });

  // Procedure routes
  app.get('/api/procedures/:id', isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID de procedimento inválido' });
      }
      
      const procedure = await storage.getProcedure(id);
      if (!procedure) {
        return res.status(404).json({ message: 'Procedimento não encontrado' });
      }
      
      res.status(200).json(procedure);
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/procedures/:id', isAuthenticated, hasRole(['admin']), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID de procedimento inválido' });
      }
      
      const procedureData = insertProcedureSchema.partial().parse(req.body);
      const updatedProcedure = await storage.updateProcedure(id, procedureData);
      
      if (!updatedProcedure) {
        return res.status(404).json({ message: 'Procedimento não encontrado' });
      }
      
      res.status(200).json(updatedProcedure);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      next(error);
    }
  });

  app.get('/api/procedures', isAuthenticated, async (req, res, next) => {
    try {
      const procedures = await storage.getAllProcedures();
      res.status(200).json(procedures);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/procedures', isAuthenticated, hasRole(['admin']), async (req, res, next) => {
    try {
      const procedureData = insertProcedureSchema.parse(req.body);
      const newProcedure = await storage.createProcedure(procedureData);
      
      res.status(201).json(newProcedure);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      next(error);
    }
  });

  // Appointment routes
  // Get appointment by ID
  app.get('/api/appointments/:id', isAuthenticated, async (req, res, next) => {
    try {
      const appointmentId = parseInt(req.params.id);
      if (isNaN(appointmentId)) {
        return res.status(400).json({ message: 'ID de agendamento inválido' });
      }
      
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: 'Agendamento não encontrado' });
      }
      
      // Enrich appointment data
      let patient = null;
      if (appointment.patientId) {
        patient = await storage.getPatient(appointment.patientId);
      }
      
      // Buscar procedimentos associados a este agendamento
      const appointmentWithProcedures = await storage.getAppointmentWithProcedures(appointmentId);
      const procedures = appointmentWithProcedures.procedures || [];
      
      const professional = await storage.getProfessional(appointment.professionalId);
      
      // Buscar dados do usuário associado ao profissional
      let professionalWithUser = professional;
      if (professional) {
        const user = await storage.getUser(professional.userId);
        if (user) {
          // Remover dados sensíveis
          const { password, ...userWithoutPassword } = user;
          
          professionalWithUser = {
            ...professional,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role
            }
          };
        }
      }
      
      res.status(200).json({
        ...appointment,
        patient,
        procedures,
        professional: professionalWithUser
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/appointments', isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user as any;
      let professionalId: number | undefined;
      
      // If user is a medico, get their professional ID
      if (user.role === 'medico') {
        const professional = await storage.getProfessionalByUserId(user.id);
        if (professional) {
          professionalId = professional.id;
        }
      }
      
      // Get date from query params
      const dateParam = req.query.date as string;
      let date: Date | undefined;
      let dateStart: Date | undefined;
      let dateEnd: Date | undefined;
      
      if (dateParam) {
        // Converte a string para um objeto Date
        date = new Date(dateParam);
        
        // Cria data de início (00:00:00) e fim (23:59:59) para o filtro
        // Usar a data local para evitar problemas com timezone
        dateStart = new Date(date);
        dateStart.setHours(0, 0, 0, 0);
        
        dateEnd = new Date(date);
        dateEnd.setHours(23, 59, 59, 999);
        
        console.log(`Filtrando agendamentos para a data: ${dateParam}`);
        console.log(`Data de início: ${dateStart.toISOString()}`);
        console.log(`Data de fim: ${dateEnd.toISOString()}`);
      }
      
      // Get appointments based on role and filters
      let appointments;
      if (professionalId) {
        appointments = await storage.getAppointmentsByProfessional(professionalId, date);
      } else {
        // In a real app, this would get all appointments
        // For simplicity, we'll get all appointments stored in memory
        appointments = Array.from((storage as any).appointments.values());
        
        // Filter by date if provided
        if (dateStart && dateEnd) {
          console.log("Filtrando agendamentos por intervalo de data");
          
          appointments = appointments.filter((appointment: any) => {
            const appointmentDate = new Date(appointment.date);
            const isInRange = appointmentDate >= dateStart! && appointmentDate <= dateEnd!;
            console.log(`Verificando: ${appointment.date}, em intervalo: ${isInRange}`);
            return isInRange;
          });
        }
      }
      
      // Enrich appointment data with patient, procedure, and professional details
      const enrichedAppointments = await Promise.all(
        appointments.map(async (appointment: any) => {
          // Buscar paciente se o ID estiver definido
          let patient = null;
          if (appointment.patientId) {
            patient = await storage.getPatient(appointment.patientId);
          }
          
          // Buscar procedimentos associados ao agendamento
          const appointmentWithProcedures = await storage.getAppointmentWithProcedures(appointment.id);
          const procedures = appointmentWithProcedures.procedures || [];
          
          // Buscar dados do profissional
          const professional = await storage.getProfessional(appointment.professionalId);
          
          // Buscar dados do usuário associado ao profissional
          let professionalWithUser = professional;
          if (professional) {
            const user = await storage.getUser(professional.userId);
            if (user) {
              professionalWithUser = {
                ...professional,
                user: {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  role: user.role
                }
              };
            }
          }
          
          return {
            ...appointment,
            patient,
            procedures,
            professional: professionalWithUser
          };
        })
      );
      
      res.status(200).json(enrichedAppointments);
    } catch (error) {
      next(error);
    }
  });

  // Add a consistent /api/queue endpoint that mirrors the waiting-queue endpoint
  app.get('/api/queue', isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user as any;
      let professionalId: number | undefined;
      
      // Get professionalId from query or current user (opcional)
      if (req.query.professionalId) {
        professionalId = parseInt(req.query.professionalId as string);
      } else if (user.role === 'medico') {
        const professional = await storage.getProfessionalByUserId(user.id);
        if (professional) {
          professionalId = professional.id;
        }
      }
      
      // ID do profissional agora é opcional
      
      let date: Date | undefined;
      if (req.query.date) {
        date = new Date(req.query.date as string);
      }
      
      // Process additional filters
      const status = req.query.status as string | undefined;
      const type = req.query.type as string | undefined;
      
      // Get appointments - agora aceita que professionalId seja undefined
      let appointments;
      
      if (professionalId) {
        appointments = await storage.getWaitingQueueByProfessional(professionalId, date);
      } else {
        // Obter todos os agendamentos para a data especificada
        const allAppointments = Array.from((storage as any).appointments.values());
        
        // Filtrar pela data
        const dateStart = new Date(date || new Date());
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(date || new Date());
        dateEnd.setHours(23, 59, 59, 999);
        
        // Filtrar por status (agendados, em espera ou em atendimento)
        appointments = allAppointments.filter((appointment: any) => 
          appointment.date >= dateStart && 
          appointment.date <= dateEnd &&
          ['scheduled', 'waiting', 'in_progress'].includes(appointment.status)
        );
      }
      
      // Apply status filter if needed
      if (status && status !== 'all') {
        appointments = appointments.filter(a => a.status === status);
      }
      
      // Enrich appointments with procedure data before filtering by type
      const appointmentsWithProcedure = await Promise.all(
        appointments.map(async (appointment) => {
          // Buscar procedimentos associados a este agendamento
          const appointmentWithProcedures = await storage.getAppointmentWithProcedures(appointment.id);
          const procedures = appointmentWithProcedures.procedures || [];
          
          return {
            ...appointment,
            procedures
          };
        })
      );
      
      // Apply type filter if needed using the procedure type
      let filteredAppointments = appointmentsWithProcedure;
      if (type && type !== 'all') {
        filteredAppointments = appointmentsWithProcedure.filter(a => {
          if (!a.procedures || !a.procedures.length) return false;
          // Verificar se pelo menos um dos procedimentos corresponde ao tipo desejado
          return a.procedures.some(proc => proc.type === type);
        });
      }
      
      // Use the already enriched appointments with procedures for final enrich
      const enrichedAppointments = await Promise.all(
        filteredAppointments.map(async (appointmentWithProc) => {
          const patient = await storage.getPatient(appointmentWithProc.patientId);
          const professional = await storage.getProfessional(appointmentWithProc.professionalId);
          
          return {
            ...appointmentWithProc,
            patient,
            professional: professional ? {
              ...professional,
              user: await storage.getUser(professional.userId)
            } : null
            // procedure is already included from the previous step
          };
        })
      );
      
      res.json(enrichedAppointments);
    } catch (error) {
      next(error);
    }
  });

  // Rota legada para compatibilidade
  app.get('/api/appointments/waiting-queue', isAuthenticated, async (req, res, next) => {
    try {
      // Redirecionar para a nova API /api/queue
      // Com os filtros adequados para mostrar apenas os status 'waiting' e 'in_progress'
      const queryParams = new URLSearchParams();
      
      if (req.query.professionalId) {
        queryParams.append('professionalId', req.query.professionalId as string);
      }
      
      if (req.query.date) {
        queryParams.append('date', req.query.date as string);
      }
      
      // Filtrar apenas por status de espera e atendimento
      queryParams.append('status', 'waiting');
      
      // Redirecionar a requisição para a nova API com os params
      req.url = `/api/queue?${queryParams.toString()}`;
      app._router.handle(req, res, next);
    } catch (error) {
      next(error);
    }
  });

  // Rota de fila de espera global removida para evitar duplicação

  app.post('/api/appointments', isAuthenticated, async (req, res, next) => {
    try {
      console.log("Recebendo dados de agendamento:", req.body);
      
      // Verificar se date já é uma data ou uma string
      let dataToValidate = { ...req.body };
      if (typeof req.body.date === 'string') {
        try {
          dataToValidate.date = new Date(req.body.date);
        } catch (e) {
          console.error("Erro ao converter data:", e);
        }
      }
      
      // Converter IDs para números se forem strings
      if (typeof dataToValidate.patientId === 'string') {
        dataToValidate.patientId = parseInt(dataToValidate.patientId);
      }
      
      if (typeof dataToValidate.professionalId === 'string') {
        dataToValidate.professionalId = parseInt(dataToValidate.professionalId);
      }
      
      // Capturar array de procedureIds e convertê-los para números
      const procedureIds = Array.isArray(dataToValidate.procedureIds) 
        ? dataToValidate.procedureIds.map((id: string|number) => typeof id === 'string' ? parseInt(id) : id)
        : [];
        
      // Remover procedureIds do objeto antes da validação
      delete dataToValidate.procedureIds;
      
      // Validar dados do agendamento
      const appointmentData = insertAppointmentSchema.parse(dataToValidate);
      console.log("Dados validados de agendamento:", appointmentData);
      
      // Validar que o profissional existe
      const professional = await storage.getProfessional(appointmentData.professionalId);
      if (!professional) {
        return res.status(400).json({ message: 'Profissional não encontrado' });
      }
      
      // Validar o paciente apenas se patientId estiver presente (pode ser pré-agendamento)
      let patient = null;
      if (appointmentData.patientId) {
        patient = await storage.getPatient(appointmentData.patientId);
        if (!patient) {
          return res.status(400).json({ message: 'Paciente não encontrado' });
        }
      }
      
      // Verificar se há pelo menos um procedimento
      if (procedureIds.length === 0) {
        return res.status(400).json({ message: 'É necessário selecionar pelo menos um procedimento' });
      }
      
      // Validar que todos os procedimentos existem
      const procedures = [];
      for (const procedureId of procedureIds) {
        const procedure = await storage.getProcedure(procedureId);
        if (!procedure) {
          return res.status(400).json({ message: `Procedimento #${procedureId} não encontrado` });
        }
        procedures.push(procedure);
      }
      
      // Criar o agendamento base
      const newAppointment = await storage.createAppointment(appointmentData);
      
      // Adicionar relações com os procedimentos
      const appointmentProcedures = [];
      for (const procedureId of procedureIds) {
        const appointmentProcedure = await storage.addProcedureToAppointment({
          appointmentId: newAppointment.id,
          procedureId: procedureId
        });
        appointmentProcedures.push(appointmentProcedure);
      }
      
      // Enriquecer a resposta com detalhes do paciente, profissional e procedimentos
      const enrichedAppointment = {
        ...newAppointment,
        patient,
        professional,
        procedures,
        appointmentProcedures
      };
      
      res.status(201).json(enrichedAppointment);
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      next(error);
    }
  });

  // Check-in de paciente (mudar status para waiting)
  app.post('/api/appointments/:id/check-in', isAuthenticated, hasRole(['medico', 'recepcionista']), async (req, res, next) => {
    try {
      const appointmentId = parseInt(req.params.id);
      if (isNaN(appointmentId)) {
        return res.status(400).json({ message: 'ID de agendamento inválido' });
      }
      
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: 'Agendamento não encontrado' });
      }
      
      if (appointment.status !== 'scheduled') {
        return res.status(400).json({ message: 'Agendamento não está com status "scheduled"' });
      }
      
      const updatedAppointment = await storage.updateAppointmentStatus(appointmentId, 'waiting');
      res.status(200).json(updatedAppointment);
    } catch (error) {
      next(error);
    }
  });
  
  // Completar um agendamento com as informações do paciente
  app.post('/api/appointments/:id/complete-patient-info', isAuthenticated, hasRole(['recepcionista', 'admin']), async (req, res, next) => {
    try {
      const appointmentId = parseInt(req.params.id);
      if (isNaN(appointmentId)) {
        return res.status(400).json({ message: 'ID de agendamento inválido' });
      }
      
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: 'Agendamento não encontrado' });
      }
      
      // Verificar se já existe um paciente associado
      if (appointment.patientId) {
        return res.status(400).json({ 
          message: 'Este agendamento já possui um paciente associado' 
        });
      }
      
      // Obter informações do paciente do corpo da requisição
      const { patientId } = req.body;
      
      if (!patientId) {
        return res.status(400).json({ message: 'ID do paciente não fornecido' });
      }
      
      // Verificar se o paciente existe
      const patient = await storage.getPatient(parseInt(patientId));
      if (!patient) {
        return res.status(404).json({ message: 'Paciente não encontrado' });
      }
      
      // Atualizar o agendamento com o ID do paciente
      const updatedAppointment = await storage.completeAppointment(
        appointmentId, 
        parseInt(patientId)
      );
      
      if (!updatedAppointment) {
        return res.status(500).json({ message: 'Erro ao atualizar agendamento' });
      }
      
      // Buscar o agendamento com todos os procedimentos relacionados
      const appointmentWithProcedures = await storage.getAppointmentWithProcedures(appointmentId);
      
      res.status(200).json({
        ...updatedAppointment,
        patient,
        procedures: appointmentWithProcedures.procedures
      });
    } catch (error) {
      console.error("Erro ao completar informações do paciente:", error);
      next(error);
    }
  });
  
  // Iniciar atendimento (mudar status para in_progress)
  app.post('/api/appointments/:id/start', isAuthenticated, hasRole(['medico']), async (req, res, next) => {
    try {
      const appointmentId = parseInt(req.params.id);
      if (isNaN(appointmentId)) {
        return res.status(400).json({ message: 'ID de agendamento inválido' });
      }
      
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: 'Agendamento não encontrado' });
      }
      
      if (appointment.status !== 'waiting') {
        return res.status(400).json({ message: 'Paciente não está na fila de espera' });
      }
      
      // Verificar se o médico é o profissional do agendamento
      const user = req.user as any;
      const professional = await storage.getProfessionalByUserId(user.id);
      
      if (!professional) {
        return res.status(404).json({ message: 'Profissional não encontrado para este usuário' });
      }
      
      // Verificar se o médico está atribuído ao agendamento
      if (appointment.professionalId !== professional.id) {
        return res.status(403).json({ 
          message: 'Apenas o médico atribuído a este agendamento pode iniciar o atendimento' 
        });
      }
      
      const updatedAppointment = await storage.updateAppointmentStatus(appointmentId, 'in_progress');
      res.status(200).json(updatedAppointment);
    } catch (error) {
      next(error);
    }
  });
  
  // Atualizar status de agendamento
  app.patch('/api/appointments/:id/status', isAuthenticated, hasRole(['medico', 'recepcionista', 'admin']), async (req, res, next) => {
    try {
      const appointmentId = parseInt(req.params.id);
      if (isNaN(appointmentId)) {
        return res.status(400).json({ message: 'ID de agendamento inválido' });
      }
      
      const { status } = req.body;
      if (!status || !['scheduled', 'waiting', 'in_progress', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: 'Status inválido' });
      }
      
      // Buscar o agendamento
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: 'Agendamento não encontrado' });
      }
      
      const user = req.user as any;
      
      // Regra especial para iniciar atendimento ou marcar como concluído
      if ((status === 'in_progress' || status === 'completed') && user.role === 'medico') {
        // Buscar o profissional associado ao usuário
        const professional = await storage.getProfessionalByUserId(user.id);
        
        if (!professional) {
          return res.status(404).json({ message: 'Profissional não encontrado para este usuário' });
        }
        
        // Apenas o médico registrado no agendamento pode iniciar ou concluir o atendimento
        if (appointment.professionalId !== professional.id) {
          return res.status(403).json({ 
            message: 'Apenas o médico atribuído a este agendamento pode iniciar ou concluir o atendimento' 
          });
        }
      }
      
      // Todos (recepcionista, admin e médico responsável) podem fazer check-in (waiting) ou cancelar
      // Apenas médico responsável pode iniciar (in_progress) ou concluir (completed) o atendimento
      
      // Se for check-in (waiting), atualizar o horário para o horário atual
      // para que os pacientes sejam atendidos por ordem de chegada
      if (status === 'waiting') {
        console.log("Check-in realizado, atualizando horário para o momento atual");
        
        // Verificar se o paciente tem cadastro completo
        if (appointment.patientId) {
          const patient = await storage.getPatient(appointment.patientId);
          
          // Se o paciente foi criado no cadastro rápido e tem flags de cadastro incompleto
          if (patient && (patient.needsCompletion || patient.phone === 'A preencher')) {
            console.log(`Paciente ${patient.name} precisa completar o cadastro`);
            // Podemos adicionar alguma lógica adicional aqui se necessário
          }
        }
        
        // Criar uma cópia do appointment com a data atualizada para o momento atual
        const currentTime = new Date();
        console.log(`Horário original: ${appointment.date}, novo horário: ${currentTime}`);
        
        // Atualizar o status e a data
        const updatedAppointment = await storage.updateAppointmentStatus(
          appointmentId, 
          status,
          currentTime // Passar a data atual para atualizar
        );
        
        if (!updatedAppointment) {
          return res.status(404).json({ message: 'Agendamento não encontrado' });
        }
        
        res.status(200).json(updatedAppointment);
      } else {
        // Para outros status, apenas atualizar o status sem alterar a data
        const updatedAppointment = await storage.updateAppointmentStatus(appointmentId, status);
        
        if (!updatedAppointment) {
          return res.status(404).json({ message: 'Agendamento não encontrado' });
        }
        
        res.status(200).json(updatedAppointment);
      }
    } catch (error) {
      next(error);
    }
  });

  // Rotas para prontuário médico
  app.get('/api/evolutions/appointment/:appointmentId', isAuthenticated, async (req, res, next) => {
    try {
      const appointmentId = parseInt(req.params.appointmentId);
      if (isNaN(appointmentId)) {
        return res.status(400).json({ message: 'ID de agendamento inválido' });
      }
      
      const evolutions = await storage.getEvolutionsByAppointment(appointmentId);
      
      // Enrich evolution data with professional details
      const enrichedEvolutions = await Promise.all(
        evolutions.map(async (evolution) => {
          const professional = await storage.getProfessional(evolution.professionalId);
          const appointment = await storage.getAppointment(evolution.appointmentId);
          
          // Get professional's user details
          let user = null;
          if (professional) {
            user = await storage.getUser(professional.userId);
            if (user) {
              // Remove sensitive data
              const { password, ...userWithoutPassword } = user;
              user = userWithoutPassword;
            }
          }
          
          return {
            ...evolution,
            professional: professional ? { ...professional, user } : null,
            appointment
          };
        })
      );
      
      res.status(200).json(enrichedEvolutions);
    } catch (error) {
      next(error);
    }
  });
  
  app.get('/api/evolutions/patient/:patientId', isAuthenticated, async (req, res, next) => {
    try {
      const patientId = parseInt(req.params.patientId);
      console.log("Buscando evoluções para o paciente ID:", patientId);
      
      if (isNaN(patientId)) {
        return res.status(400).json({ message: 'ID de paciente inválido' });
      }
      
      const evolutions = await storage.getEvolutionsByPatient(patientId);
      console.log("Evoluções encontradas:", evolutions);
      
      // Enrich evolution data with additional details
      const enrichedEvolutions = await Promise.all(
        evolutions.map(async (evolution) => {
          const professional = await storage.getProfessional(evolution.professionalId);
          const appointment = await storage.getAppointment(evolution.appointmentId);
          
          // Get professional's user details
          let user = null;
          if (professional) {
            user = await storage.getUser(professional.userId);
            if (user) {
              // Remove sensitive data
              const { password, ...userWithoutPassword } = user;
              user = userWithoutPassword;
            }
          }
          
          // Get appointment procedures if available
          let procedures = [];
          if (appointment) {
            const appointmentWithProcedures = await storage.getAppointmentWithProcedures(appointment.id);
            procedures = appointmentWithProcedures.procedures || [];
          }
          
          return {
            ...evolution,
            professional: professional ? { ...professional, user } : null,
            appointment: appointment ? { ...appointment, procedures } : null
          };
        })
      );
      
      // Sort by date (newest first)
      enrichedEvolutions.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      res.status(200).json(enrichedEvolutions);
    } catch (error) {
      next(error);
    }
  });
  
  app.post('/api/evolutions', isAuthenticated, hasRole(['medico']), async (req, res, next) => {
    try {
      const evolutionData = req.body;
      console.log("Recebendo dados de evolução:", evolutionData);
      
      // Verify that the appointment exists
      const appointment = await storage.getAppointment(evolutionData.appointmentId);
      if (!appointment) {
        console.log("Agendamento não encontrado:", evolutionData.appointmentId);
        return res.status(400).json({ message: 'Agendamento não encontrado' });
      }
      
      // Verify that the professional exists
      const professional = await storage.getProfessional(evolutionData.professionalId);
      if (!professional) {
        console.log("Profissional não encontrado:", evolutionData.professionalId);
        return res.status(400).json({ message: 'Profissional não encontrado' });
      }
      
      // Add patientId from appointment and ensure all fields have valid values
      const dataWithPatient = {
        ...evolutionData,
        patientId: appointment.patientId,
        // SOAP fields
        subjective: evolutionData.subjective || null,
        objective: evolutionData.objective || null,
        assessment: evolutionData.assessment || null,
        plan: evolutionData.plan || null,
        // Additional fields
        diagnostics: evolutionData.diagnostics || null,
        prescription: evolutionData.prescription || null,
        exams: evolutionData.exams || null,
        // Legacy fields
        notes: evolutionData.notes || null,
        symptoms: evolutionData.symptoms || null,
        diagnosis: evolutionData.diagnosis || null
      };
      
      console.log("Dados da evolução a ser criada:", dataWithPatient);
      
      try {
        const newEvolution = await storage.createEvolution(dataWithPatient);
        console.log("Evolução criada com sucesso:", newEvolution);
        
        // Update appointment status to completed
        await storage.updateAppointmentStatus(evolutionData.appointmentId, 'completed');
        
        res.status(201).json(newEvolution);
      } catch (error) {
        console.error("Erro ao criar evolução:", error);
        next(error);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      next(error);
    }
  });

  // Financial Record routes - Comentadas para implementação futura
  /*
  app.get('/api/financial-records/professional/:professionalId', isAuthenticated, hasRole(['admin', 'medico']), async (req, res, next) => {
    try {
      const professionalId = parseInt(req.params.professionalId);
      if (isNaN(professionalId)) {
        return res.status(400).json({ message: 'ID de profissional inválido' });
      }
      
      // Check if user is allowed to access this professional's data
      const user = req.user as any;
      if (user.role === 'medico') {
        const professional = await storage.getProfessionalByUserId(user.id);
        if (!professional || professional.id !== professionalId) {
          return res.status(403).json({ message: 'Acesso negado' });
        }
      }
      
      // Get date from query params
      const dateParam = req.query.date as string;
      let date: Date | undefined;
      if (dateParam) {
        date = new Date(dateParam);
      }
      
      const records = await storage.getFinancialRecordsByProfessional(professionalId, date);
      res.status(200).json(records);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/financial-records', isAuthenticated, hasRole(['medico']), async (req, res, next) => {
    try {
      const recordData = insertFinancialRecordSchema.parse(req.body);
      
      // Verify that the appointment exists
      const appointment = await storage.getAppointment(recordData.appointmentId);
      if (!appointment) {
        return res.status(400).json({ message: 'Agendamento não encontrado' });
      }
      
      // Verify that the professional exists
      const professional = await storage.getProfessional(recordData.professionalId);
      if (!professional) {
        return res.status(400).json({ message: 'Profissional não encontrado' });
      }
      
      // Check if user is allowed to create this professional's record
      const user = req.user as any;
      if (user.role === 'medico') {
        const userProfessional = await storage.getProfessionalByUserId(user.id);
        if (!userProfessional || userProfessional.id !== recordData.professionalId) {
          return res.status(403).json({ message: 'Acesso negado' });
        }
      }
      
      const newRecord = await storage.createFinancialRecord(recordData);
      
      // Update appointment status to completed
      await storage.updateAppointmentStatus(recordData.appointmentId, 'completed');
      
      res.status(201).json(newRecord);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      next(error);
    }
  });
  */
  
  // Rota temporária para finalizar consultas sem registro financeiro
  app.post('/api/financial-records', isAuthenticated, hasRole(['medico']), async (req, res, next) => {
    try {
      const recordData = insertFinancialRecordSchema.parse(req.body);
      
      // Apenas atualiza o status do agendamento para completado
      await storage.updateAppointmentStatus(recordData.appointmentId, 'completed');
      
      // Retorna um objeto vazio para manter a compatibilidade com o frontend
      res.status(201).json({
        id: 0,
        appointmentId: recordData.appointmentId,
        professionalId: recordData.professionalId,
        totalValue: 0,
        clinicCommission: 0, 
        professionalValue: 0,
        createdAt: new Date()
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
