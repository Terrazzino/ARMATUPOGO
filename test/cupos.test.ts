import { describe, it, expect } from "vitest";
import {
  contratacionOcupaCupo,
  calcularCupos,
  validarDisponibilidadCupo,
  validarReduccionCupos,
} from "@/lib/cupos";

describe("Reglas de Cupos de Eventos", () => {
  describe("contratacionOcupaCupo", () => {
    it("ACORDADO y COMPLETADO ocupan cupo", () => {
      expect(contratacionOcupaCupo("ACORDADO")).toBe(true);
      expect(contratacionOcupaCupo("COMPLETADO")).toBe(true);
    });

    it("NEGOCIANDO y CANCELADO NO ocupan cupo", () => {
      expect(contratacionOcupaCupo("NEGOCIANDO")).toBe(false);
      expect(contratacionOcupaCupo("CANCELADO")).toBe(false);
    });
  });

  describe("calcularCupos", () => {
    it("calcula correctamente los cupos con mezcla de estados", () => {
      const resultado = calcularCupos({
        cantidadRequerida: 3,
        contrataciones: [
          { estado: "ACORDADO" },
          { estado: "NEGOCIANDO" },
          { estado: "NEGOCIANDO" },
          { estado: "CANCELADO" },
        ],
      });

      expect(resultado.cuposTotales).toBe(3);
      expect(resultado.cuposOcupados).toBe(1);
      expect(resultado.cuposDisponibles).toBe(2);
      expect(resultado.hayCupoDisponible).toBe(true);
    });
  });

  describe("validarDisponibilidadCupo", () => {
    it("caso que pasa: evento con cupos libres permite nuevo acuerdo", () => {
      const resultado = validarDisponibilidadCupo({
        cantidadRequerida: 3,
        contrataciones: [
          { estado: "ACORDADO" },
          { estado: "NEGOCIANDO" },
        ],
      });

      expect(resultado.ok).toBe(true);
      if (resultado.ok) {
        expect(resultado.cuposTotales).toBe(3);
        expect(resultado.cuposOcupados).toBe(1);
        expect(resultado.cuposDisponibles).toBe(2);
      }
    });

    it("caso que falla: evento con todos los cupos ocupados rechaza nuevo acuerdo", () => {
      const resultado = validarDisponibilidadCupo({
        cantidadRequerida: 2,
        contrataciones: [
          { estado: "ACORDADO" },
          { estado: "ACORDADO" },
          { estado: "NEGOCIANDO" },
        ],
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("SIN_CUPO");
        expect(resultado.cuposTotales).toBe(2);
        expect(resultado.cuposOcupados).toBe(2);
        expect(resultado.cuposDisponibles).toBe(0);
      }
    });

    it("caso borde: cuposOcupados === cuposTotales - 1 -> queda exactamente 1 cupo disponible", () => {
      const resultado = validarDisponibilidadCupo({
        cantidadRequerida: 3,
        contrataciones: [
          { estado: "ACORDADO" },
          { estado: "ACORDADO" },
        ],
      });

      expect(resultado.ok).toBe(true);
      if (resultado.ok) {
        expect(resultado.cuposDisponibles).toBe(1);
      }
    });

    it("caso borde: cuposOcupados === cuposTotales -> 0 cupos disponibles", () => {
      const resultado = validarDisponibilidadCupo({
        cantidadRequerida: 1,
        contrataciones: [{ estado: "ACORDADO" }],
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("SIN_CUPO");
        expect(resultado.cuposDisponibles).toBe(0);
      }
    });

    it("caso borde: múltiples negociaciones activas pero 0 acuerdos -> todos los cupos disponibles", () => {
      const resultado = validarDisponibilidadCupo({
        cantidadRequerida: 4,
        contrataciones: [
          { estado: "NEGOCIANDO" },
          { estado: "NEGOCIANDO" },
          { estado: "NEGOCIANDO" },
          { estado: "NEGOCIANDO" },
          { estado: "NEGOCIANDO" },
        ],
      });

      expect(resultado.ok).toBe(true);
      if (resultado.ok) {
        expect(resultado.cuposOcupados).toBe(0);
        expect(resultado.cuposDisponibles).toBe(4);
      }
    });
  });

  describe("validarReduccionCupos", () => {
    it("caso que pasa: se puede reducir cupo si la nueva cantidad es mayor a los acuerdos existentes", () => {
      const resultado = validarReduccionCupos({
        nuevaCantidadRequerida: 3,
        contrataciones: [{ estado: "ACORDADO" }, { estado: "ACORDADO" }],
      });

      expect(resultado.ok).toBe(true);
    });

    it("caso que falla: no se puede reducir cupo por debajo de los acuerdos ya establecidos", () => {
      const resultado = validarReduccionCupos({
        nuevaCantidadRequerida: 1,
        contrataciones: [{ estado: "ACORDADO" }, { estado: "ACORDADO" }],
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("CANTIDAD_MENOR_A_CUPOS_OCUPADOS");
        expect(resultado.cuposOcupados).toBe(2);
        expect(resultado.nuevaCantidadRequerida).toBe(1);
      }
    });

    it("caso borde: reducir exactamente a la cantidad de cupos ocupados (nuevaCantidad === cuposOcupados) está permitido", () => {
      const resultado = validarReduccionCupos({
        nuevaCantidadRequerida: 2,
        contrataciones: [{ estado: "ACORDADO" }, { estado: "ACORDADO" }],
      });

      expect(resultado.ok).toBe(true);
    });
  });
});

