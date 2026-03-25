import { useState } from "react";
import { ApiError } from "../api";

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

/**
 * Generic hook for async operations (mutations)
 * Use for POST, PUT, DELETE operations
 */
export function useAsync<T, V = void>(
  asyncFunction: (variables?: V) => Promise<T>,
  immediate = false,
) {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const execute = async (variables?: V) => {
    setState({ data: null, loading: true, error: null });
    try {
      const response = await asyncFunction(variables);
      setState({ data: response, loading: false, error: null });
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      setState({ data: null, loading: false, error: apiError });
      throw apiError;
    }
  };

  return { ...state, execute };
}

/**
 * Async function factory for required parameters
 */
export function createAsyncFn<T, V>(
  fn: (variables: V) => Promise<T>,
): (variables?: V) => Promise<T> {
  return (variables?: V) => {
    if (variables === undefined) {
      return Promise.reject(new Error("Variables required"));
    }
    return fn(variables);
  };
}

/**
 * Generic hook for fetching data
 * Use for GET operations
 */
export function useFetch<T>(fetchFunction: () => Promise<T>, immediate = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<ApiError | null>(null);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFunction();
      setData(result);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
}
