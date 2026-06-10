export type AssetManual = {
  id: string;
  title: string;
  type: 'PDF' | 'Video' | 'Guide';
  assetId: string;
  size: string;
  lastUpdated: string;
  url?: string;
};

export type AssetChecklistItem = {
  id: string;
  section: string;
  item: string;
  type: 'yesno' | 'input' | 'passfail';
  value?: string;
  status?: 'pass' | 'flag' | 'fail' | null;
  note?: string;
};
