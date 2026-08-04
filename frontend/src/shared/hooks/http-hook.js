import { useState, useCallback, useRef, useEffect } from 'react';
import { API_URL } from '../util/api';

export const useHttpClient = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState();

  const activeHttpRequests = useRef([]);

 const sendRequest = useCallback(
  async (url, method = 'GET', body = null, headers = {}) => {
    setIsLoading(true);
    const httpAbortCtrl = new AbortController();
    activeHttpRequests.current.push(httpAbortCtrl);

    try {
      const requestUrl = /^https?:\/\//i.test(url)
        ? url
        : `${API_URL}${url.startsWith('/') ? url : `/${url}`}`;
      const response = await fetch(requestUrl, {
        method,
        body,
        headers,
        signal: httpAbortCtrl.signal
      });

      const contentType = response.headers.get('content-type');
      let responseData;

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || 'Non-JSON response from server');
      }

      activeHttpRequests.current = activeHttpRequests.current.filter(
        reqCtrl => reqCtrl !== httpAbortCtrl
      );

      if (!response.ok) {
        throw new Error(responseData.message || 'Request failed');
      }

      setIsLoading(false);
      return responseData;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      throw err;
    }
  },
  []
);

  const clearError = () => {
    setError(null);
  };

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      activeHttpRequests.current.forEach(abortCtrl => abortCtrl.abort());
    };
  }, []);

  return { isLoading, error, sendRequest, clearError };
};
