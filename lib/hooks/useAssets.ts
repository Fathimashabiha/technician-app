import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ApiError } from '../api';
import { fetchAssets, type Asset } from '../assetService';

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const rows = await fetchAssets();
      setAssets(rows);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not load assets';
      setError(message);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  return { assets, loading, error, reload };
}
