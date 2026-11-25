import { useEffect, useState } from 'react';

/** Cria uma object URL para o blob e a revoga quando ele muda ou o componente desmonta. */
export function useObjectUrl(blob: Blob | File | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const next = blob ? URL.createObjectURL(blob) : null;
    // A URL é um recurso externo que precisa ser revogada no cleanup; por isso nasce no effect e não no render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(next);
    return () => {
      if (next) URL.revokeObjectURL(next);
    };
  }, [blob]);
  return url;
}
