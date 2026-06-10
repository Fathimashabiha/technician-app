import { apiRequest } from './api';

export type CentralWorkOrder = Record<string, unknown>;

/** Central work order from sz-workorder-service via technician-service BFF. */
export async function fetchCentralWorkOrder(workOrderRef: string): Promise<CentralWorkOrder> {
  return apiRequest(`/external/work-order/${encodeURIComponent(workOrderRef)}`);
}
