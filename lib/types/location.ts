export type Location = {
  id: string;
  locationId: string;
  qrCode: string;
  name: string;
  address: string;
  city: string;
  portfolio: string;
  propertyType: string;
  totalFloors: string;
  areaSqft: string;
  accessMode: string;
  logisticsNotes: string;
  responsibleName: string;
  responsibleContact: string;
  status: 'Active' | 'Under Review' | 'Inactive';
  workOrders: number;
  contracts: number;
};
