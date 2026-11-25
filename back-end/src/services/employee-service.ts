import type { $Enums } from '../generated/prisma/client.js';
import { HttpError } from '../https/errors/index.js';
import { ApiPedertractorEmployee } from '../integrations/api-pedertractor-employee.js';
import type { PedertractorDesignation } from '../types/pedertractor-employee.js';

export interface RequesterIdentity {
  cardNumber: string;
  unit: $Enums.Unit;
  name: string;
  sectorName: string | null;
  costCenter: string | null;
}

/** Designação vigente: sem data de fim (ou fim no futuro), a de início mais recente. */
function currentDesignation(designations: PedertractorDesignation[] | null | undefined) {
  const now = Date.now();
  const withSector = (designations ?? []).filter((d) => d.sector);
  const active = withSector.filter((d) => !d.endDate || new Date(d.endDate).getTime() >= now);
  const pool = active.length ? active : withSector;
  return [...pool].sort((a, b) => new Date(b.startDate ?? 0).getTime() - new Date(a.startDate ?? 0).getTime())[0] ?? null;
}

export class EmployeeService {
  /** Identifica o solicitante na API corporativa pelo cartão + unidade. */
  async identify(cardNumberRaw: string, unit: $Enums.Unit): Promise<RequesterIdentity> {
    const cardNumber = cardNumberRaw.trim();
    if (!/^\d{1,10}$/.test(cardNumber)) {
      throw new HttpError('Informe o número do cartão (somente dígitos)', 400);
    }

    const employee = await new ApiPedertractorEmployee().getEmployee({ cardNumber, unit });
    if (!employee.status) {
      throw new HttpError('Colaborador inativo no cadastro corporativo', 400);
    }

    const designation = currentDesignation(employee.Designation);
    return {
      cardNumber,
      unit,
      name: employee.name.trim(),
      sectorName: designation?.sector?.name?.trim() || null,
      costCenter: designation?.sector?.costCenter?.trim() || null,
    };
  }
}
