import type { $Enums } from '../generated/prisma/client.js';
import { env } from '../env/index.js';
import { HttpError } from '../https/errors/index.js';
import type { PedertractorEmployee } from '../types/pedertractor-employee.js';

export class ApiPedertractorEmployee {
  async getEmployee({ cardNumber, unit }: { cardNumber: string; unit: $Enums.Unit }): Promise<PedertractorEmployee> {
    if (env.EMPLOYEE_VALIDATION_DISABLED) {
      return {
        id: Number(cardNumber) || 0,
        name: `Colaborador ${cardNumber}`,
        cardNumber,
        unit,
        status: true,
        Designation: [
          {
            id: 0,
            startDate: null,
            endDate: null,
            sector: { id: 'dev', name: 'Setor de desenvolvimento', costCenter: '0000' },
          },
        ],
      };
    }

    if (!env.API_PEDERTRACTOR_URL) {
      throw new HttpError(
        'API de colaboradores não configurada (API_PEDERTRACTOR_URL). Defina a URL ou EMPLOYEE_VALIDATION_DISABLED=true em dev.',
        503,
      );
    }

    let response: Response;
    try {
      response = await fetch(
        `${env.API_PEDERTRACTOR_URL}/employee/get/${encodeURIComponent(cardNumber)}/${encodeURIComponent(unit)}`,
        {
          method: 'GET',
          headers: {
            nameApplication: env.APPNAME,
            key: env.APPKEY,
          },
        },
      );
    } catch {
      throw new HttpError('Não foi possível conectar na API de colaboradores', 502);
    }

    if (response.status === 404) {
      throw new HttpError('Colaborador não encontrado. Confira o cartão e a unidade.', 404);
    }
    if (response.status !== 200) {
      throw new HttpError(`Não foi possível buscar o colaborador na API corporativa. Status: ${response.status}`, 502);
    }

    const data = (await response.json()) as PedertractorEmployee | null;
    if (!data || typeof data.name !== 'string') {
      throw new HttpError('Colaborador não encontrado. Confira o cartão e a unidade.', 404);
    }
    return data;
  }
}
