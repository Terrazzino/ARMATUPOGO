/**
 * BACKSTAGE - Fase 2: Test de Validación del Modelo de Datos y Seguridad
 *
 * Simula y valida formalmente las reglas de negocio, constraints, RLS y triggers
 * definidos en supabase/migrations/00001_initial_schema.sql
 */

import assert from "node:assert/strict";

console.log("================================================================================");
console.log("BACKSTAGE — VERIFICACIÓN FASE 2: MODELO DE DATOS Y SEGURIDAD (RLS / CONSTRAINTS)");
console.log("================================================================================\n");

let passedTests = 0;
let totalTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${description}`);
    passedTests++;
  } catch (error) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         Error: ${error.message}`);
  }
}

// ============================================================================
// SIMULADOR DE BASE DE DATOS Y REGLAS (Replica el comportamiento de Postgres & RLS)
// ============================================================================
class MockDatabase {
  constructor() {
    this.profile_users = new Map();
    this.musical_projects = new Map();
    this.events = new Map();
    this.contracts = new Map();
    this.offers = new Map();
    this.ratings = new Map();
    this.tickets = new Map();
  }

  // 1. profile_users
  createUser(authId, { email, first_name, last_name, role }) {
    if (!["MUSICIAN", "ORGANIZER"].includes(role)) {
      throw new Error(`CHECK constraint chk_role failed for role: ${role}`);
    }
    for (const u of this.profile_users.values()) {
      if (u.email === email) throw new Error(`UNIQUE constraint idx_profile_users_email violated`);
    }
    const user = { id: authId, email, first_name, last_name, role, created_at: new Date().toISOString() };
    this.profile_users.set(authId, user);
    return user;
  }

  // 2. musical_projects
  createProject(authId, data) {
    // RLS check
    if (authId !== data.user_id) throw new Error("RLS: Musicians can only insert their own projects");
    const user = this.profile_users.get(authId);
    if (!user || user.role !== "MUSICIAN") {
      throw new Error("Trigger check_project_owner_is_musician: Only MUSICIAN role can create projects");
    }
    if (data.approximate_cache !== undefined && data.approximate_cache < 0) {
      throw new Error("CHECK constraint approximate_cache >= 0 failed");
    }
    const project = { id: `proj-${Math.random()}`, ...data, is_active: data.is_active ?? true };
    this.musical_projects.set(project.id, project);
    return project;
  }

  updateProject(authId, projectId, updates) {
    const project = this.musical_projects.get(projectId);
    if (!project) throw new Error("Project not found");
    if (project.user_id !== authId) throw new Error("RLS: Cannot update someone else's project");
    Object.assign(project, updates);
    return project;
  }

  // 3. events
  createEvent(authId, data) {
    if (authId !== data.organizer_id) throw new Error("RLS: Organizers can only insert their own events");
    const user = this.profile_users.get(authId);
    if (!user || user.role !== "ORGANIZER") {
      throw new Error("Trigger check_event_owner_is_organizer: Only ORGANIZER role can create events");
    }
    if (data.required_musicians_count <= 0) {
      throw new Error("CHECK constraint required_musicians_count > 0 failed");
    }
    const event = { id: `event-${Math.random()}`, ...data, status: data.status || "PUBLISHED" };
    this.events.set(event.id, event);
    return event;
  }

  updateEvent(authId, eventId, updates) {
    const event = this.events.get(eventId);
    if (!event) throw new Error("Event not found");
    if (event.organizer_id !== authId) throw new Error("RLS: Cannot update someone else's event");
    Object.assign(event, updates);
    return event;
  }

  // 4. contracts
  createContract(authId, data) {
    // RLS: must be either organizer or musician and authId = created_by
    if (authId !== data.created_by) throw new Error("RLS: created_by must match authenticated user");
    if (authId !== data.organizer_id && authId !== data.musician_id) {
      throw new Error("RLS: User must be a participant of the contract to insert");
    }

    // Trigger validation
    const event = this.events.get(data.event_id);
    if (!event) throw new Error("Event does not exist");
    if (data.organizer_id !== event.organizer_id) {
      throw new Error("Contract organizer_id must match event organizer_id");
    }

    const project = this.musical_projects.get(data.musical_project_id);
    if (!project) throw new Error("Musical project does not exist");
    if (data.musician_id !== project.user_id) {
      throw new Error("Contract musician_id must match project owner user_id");
    }

    // Unique constraint (event_id, musical_project_id)
    for (const c of this.contracts.values()) {
      if (c.event_id === data.event_id && c.musical_project_id === data.musical_project_id) {
        throw new Error("UNIQUE constraint uq_contracts_event_project violated");
      }
    }

    const contract = {
      id: `contract-${Math.random()}`,
      ...data,
      status: data.status || "PENDING",
      agreed_amount: null,
      agreed_at: null,
    };
    this.contracts.set(contract.id, contract);
    return contract;
  }

  getContract(authId, contractId) {
    const contract = this.contracts.get(contractId);
    if (!contract) return null;
    // RLS: Only participants can view private contract
    if (contract.organizer_id !== authId && contract.musician_id !== authId) {
      throw new Error("RLS: Access denied to private contract");
    }
    return contract;
  }

  // 5. offers
  createOffer(authId, data) {
    if (authId !== data.sender_id) throw new Error("RLS: sender_id must match authenticated user");
    const contract = this.contracts.get(data.contract_id);
    if (!contract) throw new Error("Contract does not exist");

    // Sender must be participant
    if (data.sender_id !== contract.organizer_id && data.sender_id !== contract.musician_id) {
      throw new Error("Offer sender must be a participant in the contract");
    }

    // Contract cannot be closed/agreed/cancelled
    if (["AGREED", "CANCELLED", "COMPLETED", "REJECTED"].includes(contract.status)) {
      throw new Error(`Cannot create an offer on a contract with status ${contract.status}`);
    }

    if (data.amount < 0) throw new Error("CHECK constraint amount >= 0 failed");

    // Counter previous PROPOSED offers
    for (const o of this.offers.values()) {
      if (o.contract_id === data.contract_id && o.status === "PROPOSED") {
        o.status = "COUNTERED";
      }
    }

    if (contract.status === "PENDING") {
      contract.status = "NEGOTIATING";
    }

    const offer = {
      id: `offer-${Math.random()}`,
      ...data,
      status: "PROPOSED",
      created_at: new Date().toISOString(),
    };
    this.offers.set(offer.id, offer);
    return offer;
  }

  acceptOffer(authId, offerId) {
    const offer = this.offers.get(offerId);
    if (!offer) throw new Error("Offer not found");
    const contract = this.contracts.get(offer.contract_id);
    if (!contract) throw new Error("Contract not found");

    // RLS & Participant check
    if (authId !== contract.organizer_id && authId !== contract.musician_id) {
      throw new Error("RLS: Access denied");
    }
    if (authId === offer.sender_id) {
      throw new Error("Cannot accept own offer; recipient must accept");
    }
    if (["CANCELLED", "COMPLETED", "REJECTED"].includes(contract.status)) {
      throw new Error("Cannot accept an offer on a closed or cancelled contract");
    }

    offer.status = "ACCEPTED";
    contract.status = "AGREED";
    contract.agreed_amount = offer.amount;
    contract.agreed_at = new Date().toISOString();

    // Mark other offers as REJECTED
    for (const o of this.offers.values()) {
      if (o.contract_id === contract.id && o.id !== offer.id && o.status === "PROPOSED") {
        o.status = "REJECTED";
      }
    }
    return { offer, contract };
  }

  // 6. ratings
  createRating(authId, data) {
    if (authId !== data.author_id) throw new Error("RLS: author_id must match authenticated user");
    if (data.author_id === data.target_id) throw new Error("CHECK: author_id cannot equal target_id");

    if (data.score < 1 || data.score > 5) throw new Error("CHECK score BETWEEN 1 AND 5 failed");

    const contract = this.contracts.get(data.contract_id);
    if (!contract) throw new Error("Contract does not exist");

    // Contract must be AGREED or COMPLETED
    if (!["AGREED", "COMPLETED"].includes(contract.status)) {
      throw new Error(`Ratings are only allowed for contracts that are AGREED or COMPLETED (status: ${contract.status})`);
    }

    // Author must be participant
    if (data.author_id !== contract.organizer_id && data.author_id !== contract.musician_id) {
      throw new Error("Only contract participants can rate");
    }

    // Target must be counterpart
    if (data.author_id === contract.organizer_id && data.target_id !== contract.musician_id) {
      throw new Error("Target user must be the musician from the contract");
    }
    if (data.author_id === contract.musician_id && data.target_id !== contract.organizer_id) {
      throw new Error("Target user must be the organizer from the contract");
    }

    // Unique rating per author per contract
    for (const r of this.ratings.values()) {
      if (r.contract_id === data.contract_id && r.author_id === data.author_id) {
        throw new Error("UNIQUE constraint uq_ratings_contract_author violated: cannot rate twice");
      }
    }

    const rating = { id: `rating-${Math.random()}`, ...data, created_at: new Date().toISOString() };
    this.ratings.set(rating.id, rating);
    return rating;
  }
}

// ============================================================================
// SUITE DE TESTS
// ============================================================================
const db = new MockDatabase();

console.log("--- 1. Pruebas de Creación de Usuarios (Roles) ---");

test("1.1 Creación de usuario Músico válido", () => {
  const musician = db.createUser("user-musician-1", {
    email: "musician@example.com",
    first_name: "Charly",
    last_name: "Garcia",
    role: "MUSICIAN",
  });
  assert.equal(musician.role, "MUSICIAN");
});

test("1.2 Creación de usuario Organizador válido", () => {
  const organizer = db.createUser("user-organizer-1", {
    email: "organizer@example.com",
    first_name: "Daniel",
    last_name: "Grinbank",
    role: "ORGANIZER",
  });
  assert.equal(organizer.role, "ORGANIZER");
});

test("1.3 Rechazo de rol inválido (ej: ADMIN no contemplado)", () => {
  assert.throws(
    () => db.createUser("user-invalid", {
      email: "invalid@example.com",
      first_name: "Test",
      last_name: "User",
      role: "ADMIN",
    }),
    /CHECK constraint chk_role/
  );
});

console.log("\n--- 2. Pruebas de Proyectos Musicales ---");

let project1;
test("2.1 Músico crea un proyecto musical propio", () => {
  project1 = db.createProject("user-musician-1", {
    user_id: "user-musician-1",
    name: "Sui Generis",
    genre: "Rock Nacional",
    approximate_cache: 150000,
  });
  assert.equal(project1.name, "Sui Generis");
  assert.equal(project1.user_id, "user-musician-1");
});

test("2.2 Organizador NO puede crear un proyecto musical", () => {
  assert.throws(
    () => db.createProject("user-organizer-1", {
      user_id: "user-organizer-1",
      name: "Banda Trucha",
      genre: "Rock",
    }),
    /Only MUSICIAN role can create projects/
  );
});

test("2.3 Músico NO puede crear un proyecto asignándolo a otro usuario", () => {
  assert.throws(
    () => db.createProject("user-musician-1", {
      user_id: "user-organizer-1",
      name: "Proyecto Hacker",
      genre: "Rock",
    }),
    /RLS: Musicians can only insert their own projects/
  );
});

test("2.4 Músico modifica su propio proyecto", () => {
  const updated = db.updateProject("user-musician-1", project1.id, { description: "Acústicos legendarios" });
  assert.equal(updated.description, "Acústicos legendarios");
});

test("2.5 Usuario ajeno NO puede modificar proyecto ajeno", () => {
  assert.throws(
    () => db.updateProject("user-organizer-1", project1.id, { name: "Hackeado" }),
    /RLS: Cannot update someone else's project/
  );
});

console.log("\n--- 3. Pruebas de Eventos ---");

let event1;
test("3.1 Organizador crea un evento propio", () => {
  event1 = db.createEvent("user-organizer-1", {
    organizer_id: "user-organizer-1",
    title: "Festival de la Primavera 2026",
    event_date: new Date(Date.now() + 86400000 * 30).toISOString(),
    location: "Estadio Obras",
    required_musicians_count: 3,
    offered_cache: 200000,
  });
  assert.equal(event1.title, "Festival de la Primavera 2026");
});

test("3.2 Músico NO puede crear un evento", () => {
  assert.throws(
    () => db.createEvent("user-musician-1", {
      organizer_id: "user-musician-1",
      title: "Evento No Autorizado",
      event_date: new Date().toISOString(),
      location: "Club",
      required_musicians_count: 1,
    }),
    /Only ORGANIZER role can create events/
  );
});

test("3.3 Usuario ajeno NO puede modificar evento ajeno", () => {
  assert.throws(
    () => db.updateEvent("user-musician-1", event1.id, { title: "Evento Hackeado" }),
    /RLS: Cannot update someone else's event/
  );
});

console.log("\n--- 4. Pruebas de Contrataciones y Acceso Privado ---");

let contract1;
test("4.1 Músico postula su proyecto al evento (crea contratación PENDING)", () => {
  contract1 = db.createContract("user-musician-1", {
    event_id: event1.id,
    musical_project_id: project1.id,
    organizer_id: "user-organizer-1",
    musician_id: "user-musician-1",
    created_by: "user-musician-1",
  });
  assert.equal(contract1.status, "PENDING");
});

test("4.2 Se impide postulación duplicada para el mismo proyecto y evento", () => {
  assert.throws(
    () => db.createContract("user-musician-1", {
      event_id: event1.id,
      musical_project_id: project1.id,
      organizer_id: "user-organizer-1",
      musician_id: "user-musician-1",
      created_by: "user-musician-1",
    }),
    /UNIQUE constraint uq_contracts_event_project violated/
  );
});

test("4.3 Un tercero NO participante NO puede ver la contratación privada", () => {
  db.createUser("user-tercero", {
    email: "tercero@example.com",
    first_name: "Tercero",
    last_name: "Desconocido",
    role: "MUSICIAN",
  });
  assert.throws(
    () => db.getContract("user-tercero", contract1.id),
    /RLS: Access denied to private contract/
  );
});

test("4.4 Los participantes (músico y organizador) sí pueden consultar el contrato", () => {
  const cByMusician = db.getContract("user-musician-1", contract1.id);
  const cByOrganizer = db.getContract("user-organizer-1", contract1.id);
  assert.ok(cByMusician);
  assert.ok(cByOrganizer);
});

console.log("\n--- 5. Pruebas de Negociación y Ofertas ---");

let offer1, offer2;
test("5.1 Organizador realiza una primera oferta (pasa contrato a NEGOTIATING)", () => {
  offer1 = db.createOffer("user-organizer-1", {
    contract_id: contract1.id,
    sender_id: "user-organizer-1",
    amount: 180000,
    message: "Te ofrecemos $180.000 por 50 minutos de show",
  });
  assert.equal(offer1.status, "PROPOSED");
  assert.equal(contract1.status, "NEGOTIATING");
});

test("5.2 Músico realiza contraoferta (la oferta previa pasa a COUNTERED)", () => {
  offer2 = db.createOffer("user-musician-1", {
    contract_id: contract1.id,
    sender_id: "user-musician-1",
    amount: 220000,
    message: "Podemos cerrar en $220.000 e incluimos sonido propio",
  });
  assert.equal(offer1.status, "COUNTERED");
  assert.equal(offer2.status, "PROPOSED");
});

test("5.3 Organizador acepta la contraoferta (contrato pasa a AGREED con monto definitivo)", () => {
  const result = db.acceptOffer("user-organizer-1", offer2.id);
  assert.equal(result.offer.status, "ACCEPTED");
  assert.equal(result.contract.status, "AGREED");
  assert.equal(result.contract.agreed_amount, 220000);
  assert.ok(result.contract.agreed_at);
});

test("5.4 No se pueden enviar más ofertas una vez acordado el contrato", () => {
  assert.throws(
    () => db.createOffer("user-musician-1", {
      contract_id: contract1.id,
      sender_id: "user-musician-1",
      amount: 250000,
    }),
    /Cannot create an offer on a contract with status AGREED/
  );
});

console.log("\n--- 6. Pruebas de Valoraciones (Ratings) ---");

test("6.1 El músico califica al organizador tras el acuerdo", () => {
  const ratingMusician = db.createRating("user-musician-1", {
    contract_id: contract1.id,
    author_id: "user-musician-1",
    target_id: "user-organizer-1",
    score: 5,
    comment: "Excelente trato y puntualidad en el festival",
  });
  assert.equal(ratingMusician.score, 5);
});

test("6.2 El músico NO puede calificar dos veces el mismo contrato", () => {
  assert.throws(
    () => db.createRating("user-musician-1", {
      contract_id: contract1.id,
      author_id: "user-musician-1",
      target_id: "user-organizer-1",
      score: 4,
    }),
    /cannot rate twice/
  );
});

test("6.3 Un tercero NO participante NO puede emitir valoración", () => {
  assert.throws(
    () => db.createRating("user-tercero", {
      contract_id: contract1.id,
      author_id: "user-tercero",
      target_id: "user-organizer-1",
      score: 1,
    }),
    /Only contract participants can rate/
  );
});

test("6.4 El organizador califica al proyecto musical", () => {
  const ratingOrganizer = db.createRating("user-organizer-1", {
    contract_id: contract1.id,
    author_id: "user-organizer-1",
    target_id: "user-musician-1",
    target_project_id: project1.id,
    score: 5,
    comment: "Gran show, muy profesionales",
  });
  assert.equal(ratingOrganizer.score, 5);
});

console.log("\n================================================================================");
console.log(`RESULTADO DE LAS PRUEBAS: ${passedTests} de ${totalTests} pruebas superadas con éxito.`);
console.log("================================================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}

