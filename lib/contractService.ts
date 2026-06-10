import { apiRequest } from './api';

export type ContractSummary = {
  total: number;
};

export type ExternalContract = Record<string, unknown>;

/** Contract count/summary from sz-contract-service via technician-service BFF. */
export async function fetchContractSummary(): Promise<ContractSummary> {
  return apiRequest('/external/contract/summary');
}

export async function fetchExternalContract(contractRef: string): Promise<ExternalContract> {
  return apiRequest(`/external/contract/${encodeURIComponent(contractRef)}`);
}
