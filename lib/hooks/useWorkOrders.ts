import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ApiError } from '../api';
import { fetchWorkOrders, type WorkOrder } from '../workOrderService';

export function useWorkOrders(options?: { status?: string }) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const rows = await fetchWorkOrders({ status: options?.status });
      setWorkOrders(rows);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not load work orders';
      setError(message);
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  }, [options?.status]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  return { workOrders, loading, error, reload };
}
