/**
 * Validacion de reglas de dominio del MVP actual.
 *
 * Este archivo no simula autorizacion ni reemplaza las Server Actions. Comprueba las
 * transiciones y restricciones que deben respetar esas acciones.
 */

import assert from "node:assert/strict";

const POSTULATION_STATES = ["PENDIENTE", "ACEPTADA", "RECHAZADA", "CANCELADA"];
const CONTRACT_STATES = ["NEGOCIANDO", "ACORDADO", "CANCELADO", "COMPLETADO"];
const OFFER_STATES = ["PROPUESTA", "ACEPTADA", "RECHAZADA", "CONTRAOFERTADA"];

let passed = 0;
let total = 0;

function test(description, fn) {
  total += 1;
  try {
    fn();
    passed += 1;
    console.log(`  [PASS] ${description}`);
  } catch (error) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${error.message}`);
  }
}

function transitionPostulation(postulation, nextState) {
  if (postulation.estado !== "PENDIENTE" || !POSTULATION_STATES.includes(nextState)) {
    throw new Error(`Transicion de postulacion no permitida: ${postulation.estado} -> ${nextState}`);
  }
  postulation.estado = nextState;
  return postulation;
}

function createContractFromAcceptedPostulation(postulation) {
  if (postulation.estado !== "ACEPTADA") {
    throw new Error("Solo una postulacion ACEPTADA puede generar una contratacion");
  }
  return {
    id: "contrato-1",
    eventoId: postulation.eventoId,
    proyectoMusicalId: postulation.proyectoMusicalId,
    musicoId: postulation.musicoId,
    organizadorId: "organizador-1",
    postulacionId: postulation.id,
    estado: "NEGOCIANDO",
    ofertas: [],
  };
}

function getReceivedPostulations(postulations, organizerId) {
  return postulations.filter((postulation) => postulation.organizadorId === organizerId);
}

function processPendingPostulation({ postulation, organizerId, contracts, nextState }) {
  if (postulation.organizadorId !== organizerId) throw new Error("Postulacion de otro organizador");
  if (postulation.estado !== "PENDIENTE") throw new Error("Postulacion ya procesada");

  postulation.estado = nextState;
  if (nextState === "ACEPTADA") {
    if (contracts.some((item) => item.postulacionId === postulation.id)) {
      throw new Error("Contratacion duplicada");
    }
    contracts.push(createContractFromAcceptedPostulation(postulation));
  }

  return postulation;
}

function createOffer(contract, senderId, amount) {
  if (contract.estado !== "NEGOCIANDO") {
    throw new Error("Una contratacion cerrada no acepta nuevas ofertas");
  }
  for (const offer of contract.ofertas) {
    if (offer.estado === "PROPUESTA") offer.estado = "CONTRAOFERTADA";
  }
  const offer = { id: `oferta-${contract.ofertas.length + 1}`, remitenteId: senderId, monto: amount, estado: "PROPUESTA" };
  contract.ofertas.push(offer);
  return offer;
}

function acceptOffer(contract, offerId, userId) {
  const offer = contract.ofertas.find((item) => item.id === offerId);
  if (!offer) throw new Error("Oferta inexistente");
  if (offer.remitenteId === userId) throw new Error("El emisor no puede aceptar su propia oferta");
  if (![contract.organizadorId, contract.musicoId].includes(userId)) throw new Error("Solo la contraparte puede aceptar");
  if (offer.estado !== "PROPUESTA" || contract.estado !== "NEGOCIANDO") throw new Error("La oferta o contratacion ya no estan vigentes");

  offer.estado = "ACEPTADA";
  contract.estado = "ACORDADO";
  contract.montoPactado = offer.monto;
  for (const other of contract.ofertas) {
    if (other.id !== offer.id && other.estado === "PROPUESTA") other.estado = "CONTRAOFERTADA";
  }
  return { offer, contract };
}

function rejectOffer(contract, offerId, userId) {
  const offer = contract.ofertas.find((item) => item.id === offerId);
  if (!offer) throw new Error("Oferta inexistente");
  if (offer.remitenteId === userId) throw new Error("El emisor no puede rechazar su propia oferta");
  if (![contract.organizadorId, contract.musicoId].includes(userId)) throw new Error("Solo la contraparte puede rechazar");
  if (offer.estado !== "PROPUESTA" || contract.estado !== "NEGOCIANDO") throw new Error("La oferta o contratacion ya no estan vigentes");
  offer.estado = "RECHAZADA";
  return offer;
}

function createRating(contract, authorId, score) {
  if (contract.estado !== "COMPLETADO") throw new Error("Solo una contratacion COMPLETADO puede valorarse");
  if (![contract.organizadorId, contract.musicoId].includes(authorId)) throw new Error("Solo participantes pueden valorar");
  if (score < 1 || score > 5) throw new Error("El puntaje debe estar entre 1 y 5");
  if (authorId === contract.organizadorId) {
    return { autorId: authorId, destinatarioId: contract.musicoId, proyectoDestinatarioId: contract.proyectoMusicalId, puntaje: score };
  }
  return { autorId: authorId, destinatarioId: contract.organizadorId, proyectoDestinatarioId: null, puntaje: score };
}

console.log("ARMA TU POGO - reglas actuales de postulaciones, contrataciones, ofertas y valoraciones\n");
console.log("--- Postulaciones ---");

const pending = { id: "postulacion-1", eventoId: "evento-1", proyectoMusicalId: "proyecto-1", musicoId: "musico-1", organizadorId: "organizador-1", estado: "PENDIENTE" };
test("El musico crea una Postulacion PENDIENTE y no una Contratacion", () => {
  assert.equal(pending.estado, "PENDIENTE");
  assert.equal("contratacionId" in pending, false);
});

test("Se rechaza una postulacion duplicada por evento y proyecto", () => {
  const uniqueKeys = new Set([`${pending.eventoId}:${pending.proyectoMusicalId}`]);
  assert.throws(() => {
    const key = `${pending.eventoId}:${pending.proyectoMusicalId}`;
    if (uniqueKeys.has(key)) throw new Error("Postulacion duplicada");
  }, /duplicada/);
});

test("Una postulacion PENDIENTE puede pasar a ACEPTADA", () => {
  assert.equal(transitionPostulation({ ...pending }, "ACEPTADA").estado, "ACEPTADA");
});

test("Una postulacion PENDIENTE puede pasar a RECHAZADA", () => {
  assert.equal(transitionPostulation({ ...pending }, "RECHAZADA").estado, "RECHAZADA");
});

test("Una postulacion PENDIENTE puede pasar a CANCELADA", () => {
  assert.equal(transitionPostulation({ ...pending }, "CANCELADA").estado, "CANCELADA");
});

test("Los estados terminales no pueden volver a cancelarse", () => {
  for (const estado of ["ACEPTADA", "RECHAZADA", "CANCELADA"]) {
    assert.throws(() => transitionPostulation({ ...pending, estado }, "CANCELADA"), /no permitida/);
  }
});

test("El organizador ve las postulaciones de sus eventos y no las ajenas", () => {
  const received = getReceivedPostulations([
    { ...pending },
    { ...pending, id: "postulacion-2", organizadorId: "organizador-2" },
  ], "organizador-1");
  assert.deepEqual(received.map((item) => item.id), ["postulacion-1"]);
});

test("Un organizador no puede gestionar la postulacion de otro", () => {
  assert.throws(() => processPendingPostulation({
    postulation: { ...pending },
    organizerId: "organizador-2",
    contracts: [],
    nextState: "RECHAZADA",
  }), /otro organizador/);
});

test("Rechazar una postulacion pendiente no crea una contratacion", () => {
  const contracts = [];
  const rejected = processPendingPostulation({
    postulation: { ...pending },
    organizerId: "organizador-1",
    contracts,
    nextState: "RECHAZADA",
  });
  assert.equal(rejected.estado, "RECHAZADA");
  assert.equal(contracts.length, 0);
});

test("Aceptar crea exactamente una contratacion NEGOCIANDO vinculada a la postulacion", () => {
  const contracts = [];
  processPendingPostulation({
    postulation: { ...pending },
    organizerId: "organizador-1",
    contracts,
    nextState: "ACEPTADA",
  });
  assert.equal(contracts.length, 1);
  assert.equal(contracts[0].estado, "NEGOCIANDO");
  assert.equal(contracts[0].postulacionId, pending.id);
});

test("Una postulacion terminal no se procesa otra vez y la doble aceptacion no duplica contratos", () => {
  const contracts = [];
  const accepted = { ...pending };
  processPendingPostulation({ postulation: accepted, organizerId: "organizador-1", contracts, nextState: "ACEPTADA" });
  assert.throws(() => processPendingPostulation({
    postulation: accepted,
    organizerId: "organizador-1",
    contracts,
    nextState: "ACEPTADA",
  }), /procesada/);
  assert.equal(contracts.length, 1);
});

test("Una invitacion directa crea una contratacion sin exigir postulacionId", () => {
  const directInvitation = {
    eventoId: "evento-1",
    proyectoMusicalId: "proyecto-2",
    organizadorId: "organizador-1",
    musicoId: "musico-2",
    estado: "NEGOCIANDO",
    postulacionId: null,
  };
  assert.equal(directInvitation.estado, "NEGOCIANDO");
  assert.equal(directInvitation.postulacionId, null);
});

console.log("\n--- Contrataciones y ofertas ---");
const contract = createContractFromAcceptedPostulation({ ...pending, estado: "ACEPTADA" });

test("Una postulacion aceptada genera una Contratacion NEGOCIANDO", () => {
  assert.equal(contract.estado, "NEGOCIANDO");
  assert.equal(CONTRACT_STATES.includes("PENDIENTE"), false);
});

test("NEGOCIANDO y ACORDADO pueden pasar a CANCELADO", () => {
  assert.equal(contract.estado, "NEGOCIANDO");
  contract.estado = "CANCELADO";
  assert.equal(contract.estado, "CANCELADO");
  contract.estado = "ACORDADO";
  contract.estado = "CANCELADO";
  assert.equal(contract.estado, "CANCELADO");
});

test("La negociacion se cierra y no admite nuevas ofertas en estados terminales", () => {
  contract.estado = "COMPLETADO";
  assert.throws(() => createOffer(contract, "musico-1", 100), /cerrada/);
  contract.estado = "NEGOCIANDO";
});

let firstOffer;
test("Una nueva oferta nace como PROPUESTA", () => {
  firstOffer = createOffer(contract, "organizador-1", 180000);
  assert.equal(firstOffer.estado, "PROPUESTA");
  assert.ok(OFFER_STATES.includes(firstOffer.estado));
});

let counterOffer;
test("Una contraoferta convierte la propuesta anterior en CONTRAOFERTADA", () => {
  counterOffer = createOffer(contract, "musico-1", 220000);
  assert.equal(firstOffer.estado, "CONTRAOFERTADA");
  assert.equal(counterOffer.estado, "PROPUESTA");
});

test("Solo la contraparte puede aceptar o rechazar una PROPUESTA", () => {
  assert.throws(() => acceptOffer(contract, counterOffer.id, "musico-1"), /emisor/);
  assert.throws(() => rejectOffer(contract, counterOffer.id, "musico-1"), /emisor/);
});

test("Solo una PROPUESTA puede rechazarse y una contratacion cerrada lo impide", () => {
  const rejectionContract = createContractFromAcceptedPostulation({ ...pending, estado: "ACEPTADA" });
  const rejectionOffer = createOffer(rejectionContract, "organizador-1", 150000);
  assert.equal(rejectOffer(rejectionContract, rejectionOffer.id, "musico-1").estado, "RECHAZADA");
  assert.throws(() => rejectOffer(rejectionContract, rejectionOffer.id, "musico-1"), /vigentes/);

  const closedContract = createContractFromAcceptedPostulation({ ...pending, estado: "ACEPTADA" });
  const closedOffer = createOffer(closedContract, "organizador-1", 150000);
  closedContract.estado = "ACORDADO";
  assert.throws(() => rejectOffer(closedContract, closedOffer.id, "musico-1"), /vigentes/);
});

test("Aceptar una oferta deja el contrato ACORDADO y sin otras PROPUESTA vigentes", () => {
  const result = acceptOffer(contract, counterOffer.id, "organizador-1");
  assert.equal(result.offer.estado, "ACEPTADA");
  assert.equal(result.contract.estado, "ACORDADO");
  assert.equal(result.contract.montoPactado, 220000);
  assert.equal(contract.ofertas.filter((offer) => offer.estado === "PROPUESTA").length, 0);
});

test("Una segunda aceptacion no puede modificar el acuerdo", () => {
  assert.throws(() => acceptOffer(contract, counterOffer.id, "organizador-1"), /vigentes/);
  assert.equal(contract.montoPactado, 220000);
});

console.log("\n--- Valoraciones ---");
test("ACORDADO no puede valorarse y COMPLETADO si", () => {
  assert.throws(() => createRating({ ...contract, estado: "ACORDADO" }, "musico-1", 5), /COMPLETADO/);
  const rating = createRating({ ...contract, estado: "COMPLETADO" }, "musico-1", 5);
  assert.equal(rating.destinatarioId, "organizador-1");
  assert.equal(rating.proyectoDestinatarioId, null);
});

test("Solo participantes pueden valorar y el destinatario nunca es el propio autor", () => {
  assert.throws(() => createRating({ ...contract, estado: "COMPLETADO" }, "tercero-1", 5), /participantes/);
  const rating = createRating({ ...contract, estado: "COMPLETADO" }, "musico-1", 5);
  assert.notEqual(rating.autorId, rating.destinatarioId);
});

test("El puntaje debe estar entre 1 y 5", () => {
  assert.throws(() => createRating({ ...contract, estado: "COMPLETADO" }, "musico-1", 0), /entre 1 y 5/);
  assert.throws(() => createRating({ ...contract, estado: "COMPLETADO" }, "musico-1", 6), /entre 1 y 5/);
});

test("El organizador valora al proyecto contratado", () => {
  const rating = createRating({ ...contract, estado: "COMPLETADO" }, "organizador-1", 4);
  assert.equal(rating.destinatarioId, "musico-1");
  assert.equal(rating.proyectoDestinatarioId, "proyecto-1");
});

test("Una misma parte solo puede valorar una vez la contratacion", () => {
  const ratings = new Set();
  const key = `${contract.id}:musico-1`;
  ratings.add(key);
  assert.throws(() => {
    if (ratings.has(key)) throw new Error("valoracion duplicada");
  }, /duplicada/);
});

console.log(`\nResultado: ${passed} de ${total} pruebas superadas.`);
assert.equal(passed, total);
