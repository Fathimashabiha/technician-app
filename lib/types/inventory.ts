export type InventoryItem = {
  id: string;
  name: string;
  partNumber: string;
  quantity: number;
  unit: string;
  location: string;
  minStock: number;
  stockHealth?: 'In Stock' | 'Low Stock' | 'Out of Stock';
};
