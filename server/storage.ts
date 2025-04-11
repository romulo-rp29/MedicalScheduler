import { createClient } from "@neondatabase/serverless";
import {
  User,
  InsertUser,
  Professional,
  InsertProfessional,
  Patient,
  InsertPatient,
  Procedure,
  InsertProcedure,
  Appointment,
  InsertAppointment,
  AppointmentProcedure,
  InsertAppointmentProcedure,
  Evolution,
  InsertEvolution,
  FinancialRecord,
  InsertFinancialRecord,
} from "@shared/schema";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(
    id: number,
    userData: Partial<InsertUser>,
  ): Promise<User | undefined>;

  // Professionals
  getProfessional(id: number): Promise<Professional | undefined>;
  getProfessionalByUserId(userId: number): Promise<Professional | undefined>;
  getAllProfessionals(): Promise<Professional[]>;
  createProfessional(professional: InsertProfessional): Promise<Professional>;
  updateProfessional(
    id: number, 
    professionalData: Partial<InsertProfessional>
  ): Promise<Professional | undefined>;

  // Patients
  getPatient(id: number): Promise<Patient | undefined>;
  getAllPatients(): Promise<Patient[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(
    id: number,
    patient: Partial<InsertPatient>,
  ): Promise<Patient | undefined>;

  // Procedures
  getProcedure(id: number): Promise<Procedure | undefined>;
  getAllProcedures(): Promise<Procedure[]>;
  createProcedure(procedure: InsertProcedure): Promise<Procedure>;
  updateProcedure(
    id: number,
    procedureData: Partial<InsertProcedure>
  ): Promise<Procedure | undefined>;

  // Appointments
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAppointmentsByProfessional(
    professionalId: number,
    date?: Date,
  ): Promise<Appointment[]>;
  getWaitingQueueByProfessional(
    professionalId: number,
    date?: Date,
  ): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(
    id: number,
    status: string,
    newDate?: Date,
  ): Promise<Appointment | undefined>;
  completeAppointment(
    id: number,
    patientId: number,
  ): Promise<Appointment | undefined>;

  // Appointment Procedures
  getAppointmentProcedures(
    appointmentId: number,
  ): Promise<AppointmentProcedure[]>;
  addProcedureToAppointment(
    appointmentProcedure: InsertAppointmentProcedure,
  ): Promise<AppointmentProcedure>;
  getAppointmentWithProcedures(
    appointmentId: number,
  ): Promise<{ appointment: Appointment; procedures: Procedure[] }>;

  // Evolutions
  getEvolution(id: number): Promise<Evolution | undefined>;
  getEvolutionsByAppointment(appointmentId: number): Promise<Evolution[]>;
  getEvolutionsByPatient(patientId: number): Promise<Evolution[]>;
  createEvolution(evolution: InsertEvolution): Promise<Evolution>;

  // Financial Records
  getFinancialRecord(id: number): Promise<FinancialRecord | undefined>;
  getFinancialRecordsByProfessional(
    professionalId: number,
    date?: Date,
  ): Promise<FinancialRecord[]>;
  createFinancialRecord(
    record: InsertFinancialRecord,
  ): Promise<FinancialRecord>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private professionals: Map<number, Professional>;
  private patients: Map<number, Patient>;
  private procedures: Map<number, Procedure>;
  private appointments: Map<number, Appointment>;
  private appointmentProcedures: Map<number, AppointmentProcedure>;
  private evolutions: Map<number, Evolution>;
  private financialRecords: Map<number, FinancialRecord>;
  currentId: {
    users: number;
    professionals: number;
    patients: number;
    procedures: number;
    appointments: number;
    appointmentProcedures: number;
    evolutions: number;
    financialRecords: number;
  };

  constructor() {
    this.users = new Map();
    this.professionals = new Map();
    this.patients = new Map();
    this.procedures = new Map();
    this.appointments = new Map();
    this.appointmentProcedures = new Map();
    this.evolutions = new Map();
    this.financialRecords = new Map();

    this.currentId = {
      users: 1,
      professionals: 1,
      patients: 1,
      procedures: 1,
      appointments: 1,
      appointmentProcedures: 1,
      evolutions: 1,
      financialRecords: 1,
    };

    // Initialize with admin user and test data
    this.initializeTestData();
  }

  // Método para inicializar dados de teste
  private async initializeTestData() {
    // 1. Criar usuário administrador
    const adminUser = await this.createUser({
      email: "admin@clinica.com",
      password: bcrypt.hashSync("admin123", 10),
      name: "Administrador",
      role: "admin",
      isActive: true,
    });

    // 2. Criar médico com os dados solicitados
    const doctorUser = await this.createUser({
      email: "dr.walberlima@gmail.com",
      password: bcrypt.hashSync("88117755", 10),
      name: "Walber Lima Pinto",
      phone: "",
      role: "medico",
      isActive: true,
    });

    // Criar recepcionista
    const receptionistUser = await this.createUser({
      email: "raissinhacoqueiro18@gmail.com",
      password: bcrypt.hashSync("88117755", 10),
      name: "RAISSA DE KASSIA COELHO COQUEIRO",
      role: "recepcionista",
      isActive: true,
    });

    // 3. Criar perfil profissional para o médico
    const doctor = await this.createProfessional({
      userId: doctorUser.id,
      specialty: "Gastroenterologia",
      commission: 70, // 70% para o médico, 30% para a clínica
    });

    // 4. Criar procedimentos
    const consultaProcedure = await this.createProcedure({
      name: "CONSULTA COM GASTRO",
      description: "Consulta padrão com Gastroenterologista",
      type: "consultation",
      value: 250.0,
    });

    const examProcedure = await this.createProcedure({
      name: "ENDOSCOPIA",
      description: "Endoscopia com teste da bactéria",
      type: "exam",
      value: 250.0,
    });

    // 5. Criar paciente
    const patient = await this.createPatient({
      name: "ROMULO RODRIGUES PINTO",
      email: "romulo@email.com",
      phone: "85988888888",
      cpf: "123.456.789-00",
      rg: "1234567",
      profession: "Engenheiro",
      birthDate: new Date(1980, 0, 1), // 1 de Janeiro de 1980
      gender: "male",
      address: "Rua Principal, 123 - Fortaleza/CE",
      observations: "Nenhuma observação",
      createdBy: adminUser.id,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    // Hash password if it's not already hashed (contains no $ which are in bcrypt hashes)
    const password = insertUser.password.includes("$")
      ? insertUser.password
      : bcrypt.hashSync(insertUser.password, 10);

    const user: User = { ...insertUser, id, password };
    this.users.set(id, user);
    return user;
  }

  async updateUser(
    id: number,
    userData: Partial<InsertUser>,
  ): Promise<User | undefined> {
    const existingUser = await this.getUser(id);
    if (!existingUser) return undefined;

    // Se tiver senha para atualizar, verifica se precisa fazer hash
    let updatedPassword = existingUser.password;
    if (userData.password) {
      updatedPassword = userData.password.includes("$")
        ? userData.password
        : bcrypt.hashSync(userData.password, 10);
    }

    const updatedUser = {
      ...existingUser,
      ...userData,
      password: updatedPassword,
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Professional methods
  async getProfessional(id: number): Promise<Professional | undefined> {
    return this.professionals.get(id);
  }

  async getProfessionalByUserId(
    userId: number,
  ): Promise<Professional | undefined> {
    return Array.from(this.professionals.values()).find(
      (professional) => professional.userId === userId,
    );
  }

  async getAllProfessionals(): Promise<Professional[]> {
    return Array.from(this.professionals.values());
  }

  async createProfessional(
    insertProfessional: InsertProfessional,
  ): Promise<Professional> {
    const id = this.currentId.professionals++;
    const professional: Professional = { ...insertProfessional, id };
    this.professionals.set(id, professional);
    return professional;
  }

  async updateProfessional(
    id: number,
    professionalData: Partial<InsertProfessional>,
  ): Promise<Professional | undefined> {
    const existingProfessional = await this.getProfessional(id);
    if (!existingProfessional) return undefined;

    const updatedProfessional = { ...existingProfessional, ...professionalData };
    this.professionals.set(id, updatedProfessional);
    return updatedProfessional;
  }

  // Patient methods
  async getPatient(id: number): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async getAllPatients(): Promise<Patient[]> {
    return Array.from(this.patients.values());
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = this.currentId.patients++;
    const patient: Patient = { ...insertPatient, id };
    this.patients.set(id, patient);
    return patient;
  }

  async updatePatient(
    id: number,
    patientUpdate: Partial<InsertPatient>,
  ): Promise<Patient | undefined> {
    const existingPatient = await this.getPatient(id);
    if (!existingPatient) return undefined;

    const updatedPatient = { ...existingPatient, ...patientUpdate };
    this.patients.set(id, updatedPatient);
    return updatedPatient;
  }

  // Procedure methods
  async getProcedure(id: number): Promise<Procedure | undefined> {
    return this.procedures.get(id);
  }

  async getAllProcedures(): Promise<Procedure[]> {
    return Array.from(this.procedures.values());
  }

  async createProcedure(insertProcedure: InsertProcedure): Promise<Procedure> {
    const id = this.currentId.procedures++;
    const procedure: Procedure = { ...insertProcedure, id };
    this.procedures.set(id, procedure);
    return procedure;
  }

  async updateProcedure(
    id: number,
    procedureData: Partial<InsertProcedure>
  ): Promise<Procedure | undefined> {
    const existingProcedure = await this.getProcedure(id);
    if (!existingProcedure) return undefined;

    const updatedProcedure = { ...existingProcedure, ...procedureData };
    this.procedures.set(id, updatedProcedure);
    return updatedProcedure;
  }

  // Appointment methods
  async getAppointment(id: number): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async getAppointmentsByProfessional(
    professionalId: number,
    date?: Date,
  ): Promise<Appointment[]> {
    const appointments = Array.from(this.appointments.values()).filter(
      (appointment) => appointment.professionalId === professionalId,
    );

    if (date) {
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);

      return appointments.filter(
        (appointment) =>
          appointment.date >= dateStart && appointment.date <= dateEnd,
      );
    }

    return appointments;
  }

  async getWaitingQueueByProfessional(
    professionalId: number,
    date?: Date,
  ): Promise<Appointment[]> {
    const appointments = await this.getAppointmentsByProfessional(
      professionalId,
      date,
    );
    return appointments.filter((appointment) =>
      ["scheduled", "waiting", "in_progress"].includes(appointment.status),
    );
  }

  async createAppointment(
    insertAppointment: InsertAppointment,
  ): Promise<Appointment> {
    const id = this.currentId.appointments++;
    const appointment: Appointment = { ...insertAppointment, id };
    this.appointments.set(id, appointment);
    return appointment;
  }

  async updateAppointmentStatus(
    id: number,
    status: string,
    newDate?: Date,
  ): Promise<Appointment | undefined> {
    const appointment = await this.getAppointment(id);
    if (!appointment) return undefined;

    // Se a nova data for fornecida, atualiza a data do agendamento
    const updatedAppointment = newDate 
      ? { ...appointment, status, date: newDate }
      : { ...appointment, status };
      
    this.appointments.set(id, updatedAppointment);
    return updatedAppointment;
  }

  async completeAppointment(
    id: number,
    patientId: number,
  ): Promise<Appointment | undefined> {
    const appointment = await this.getAppointment(id);
    if (!appointment) return undefined;

    const updatedAppointment = {
      ...appointment,
      patientId,
      isPending: false,
    };
    this.appointments.set(id, updatedAppointment);
    return updatedAppointment;
  }

  // Appointment Procedures methods
  async getAppointmentProcedures(
    appointmentId: number,
  ): Promise<AppointmentProcedure[]> {
    return Array.from(this.appointmentProcedures.values()).filter(
      (ap) => ap.appointmentId === appointmentId,
    );
  }

  async addProcedureToAppointment(
    insertAppointmentProcedure: InsertAppointmentProcedure,
  ): Promise<AppointmentProcedure> {
    const id = this.currentId.appointmentProcedures++;
    const appointmentProcedure: AppointmentProcedure = {
      ...insertAppointmentProcedure,
      id,
    };
    this.appointmentProcedures.set(id, appointmentProcedure);
    return appointmentProcedure;
  }

  async getAppointmentWithProcedures(
    appointmentId: number,
  ): Promise<{ appointment: Appointment; procedures: Procedure[] }> {
    const appointment = await this.getAppointment(appointmentId);
    if (!appointment) {
      throw new Error(`Appointment with id ${appointmentId} not found`);
    }

    const appointmentProcedures =
      await this.getAppointmentProcedures(appointmentId);
    const procedureIds = appointmentProcedures.map((ap) => ap.procedureId);

    const procedures: Procedure[] = [];
    for (const procedureId of procedureIds) {
      const procedure = await this.getProcedure(procedureId);
      if (procedure) {
        procedures.push(procedure);
      }
    }

    return { appointment, procedures };
  }

  // Evolution methods
  async getEvolution(id: number): Promise<Evolution | undefined> {
    return this.evolutions.get(id);
  }

  async getEvolutionsByAppointment(
    appointmentId: number,
  ): Promise<Evolution[]> {
    return Array.from(this.evolutions.values()).filter(
      (evolution) => evolution.appointmentId === appointmentId,
    );
  }

  async getEvolutionsByPatient(patientId: number): Promise<Evolution[]> {
    console.log(
      `Buscando evoluções do paciente ${patientId}. Evoluções totais: ${this.evolutions.size}`,
    );
    const allEvolutions = Array.from(this.evolutions.values());
    console.log("Todas as evoluções:", allEvolutions);

    const filteredEvolutions = allEvolutions.filter((evolution) => {
      console.log(
        `Comparando: evolução.patientId (${evolution.patientId}) === patientId (${patientId}) = ${evolution.patientId === patientId}`,
      );
      return evolution.patientId === patientId;
    });

    console.log(
      `Evoluções filtradas para o paciente ${patientId}:`,
      filteredEvolutions,
    );
    return filteredEvolutions;
  }

  async createEvolution(insertEvolution: InsertEvolution): Promise<Evolution> {
    const id = this.currentId.evolutions++;
    const evolution: Evolution = {
      ...insertEvolution,
      id,
      createdAt: new Date(),
      // SOAP fields
      subjective: insertEvolution.subjective || null,
      objective: insertEvolution.objective || null,
      assessment: insertEvolution.assessment || null,
      plan: insertEvolution.plan || null,
      // Additional fields
      diagnostics: insertEvolution.diagnostics || null,
      prescription: insertEvolution.prescription || null,
      exams: insertEvolution.exams || null,
      // Legacy fields
      symptoms: insertEvolution.symptoms || null,
      diagnosis: insertEvolution.diagnosis || null,
      notes: insertEvolution.notes || null,
    };
    this.evolutions.set(id, evolution);
    return evolution;
  }

  // Financial Record methods
  async getFinancialRecord(id: number): Promise<FinancialRecord | undefined> {
    return this.financialRecords.get(id);
  }

  async getFinancialRecordsByProfessional(
    professionalId: number,
    date?: Date,
  ): Promise<FinancialRecord[]> {
    const records = Array.from(this.financialRecords.values()).filter(
      (record) => record.professionalId === professionalId,
    );

    if (date) {
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);

      return records.filter(
        (record) =>
          record.createdAt >= dateStart && record.createdAt <= dateEnd,
      );
    }

    return records;
  }

  async createFinancialRecord(
    insertRecord: InsertFinancialRecord,
  ): Promise<FinancialRecord> {
    const id = this.currentId.financialRecords++;
    const record: FinancialRecord = {
      ...insertRecord,
      id,
      createdAt: new Date(),
    };
    this.financialRecords.set(id, record);
    return record;
  }
}

export const storage = new MemStorage();
