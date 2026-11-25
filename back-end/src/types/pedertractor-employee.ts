/** Resposta de GET /employee/get/:cardNumber/:unit da API corporativa (campos usados aqui). */
export interface PedertractorDesignationSector {
  id: string;
  name: string;
  costCenter: string;
}

export interface PedertractorDesignation {
  id: number;
  startDate: string | null;
  endDate: string | null;
  sector: PedertractorDesignationSector | null;
}

export interface PedertractorEmployee {
  id: number;
  name: string;
  cardNumber: string;
  unit: string;
  status: boolean;
  Designation?: PedertractorDesignation[] | null;
}
