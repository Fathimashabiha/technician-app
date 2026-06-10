export type Asset = {
  id: string;
  name: string;
  location: string;
  type: string;
  lastService: string;
  nextService: string;
  status: 'Active' | 'Inactive' | 'Under Repair';
  openWOs: number;
  serialNumber: string;
  manufacturer: string;
  installationDate: string;
  warrantyExpiry: string;
  criticality: 'Critical' | 'Major' | 'Minor';
  slaTier: string;
  slaPolicy: { response: string; resolution: string };
};
