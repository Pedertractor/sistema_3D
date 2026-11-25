import { useQuery } from '@tanstack/react-query';
import { ImageIcon } from 'lucide-react';

import { ImagePicker, type ImageChange } from '@/components/ImagePicker';
import { useObjectUrl } from '@/hooks/use-object-url';
import { cn } from '@/lib/utils';
import { machinesApi, type Machine } from '@/services/machines';

/** Foto salva da máquina (a rota exige token, por isso vem como blob). */
function useMachineImageUrl(machine: Pick<Machine, 'id' | 'imageStoredName' | 'updatedAt'> | null) {
  const hasImage = Boolean(machine?.imageStoredName);
  const { data } = useQuery({
    queryKey: ['machine-image', machine?.id, machine?.imageStoredName],
    queryFn: () => machinesApi.getImage(machine!.id, machine!.updatedAt),
    enabled: hasImage,
    staleTime: Infinity,
  });
  return useObjectUrl(hasImage ? data : null);
}

export function MachineImage({
  machine,
  className,
}: {
  machine: Pick<Machine, 'id' | 'name' | 'imageStoredName' | 'updatedAt'>;
  className?: string;
}) {
  const url = useMachineImageUrl(machine);
  return (
    <div className={cn('flex aspect-video items-center justify-center overflow-hidden rounded-md bg-muted', className)}>
      {url ? (
        <img src={url} alt={`Foto da máquina ${machine.name}`} className='size-full object-cover' />
      ) : (
        <ImageIcon className='size-8 text-muted-foreground/50' aria-hidden />
      )}
    </div>
  );
}

export function MachineImagePicker({
  machine,
  value,
  onChange,
}: {
  machine: Machine | null;
  value: ImageChange;
  onChange: (change: ImageChange) => void;
}) {
  const savedUrl = useMachineImageUrl(machine);
  return <ImagePicker id='mimage' savedUrl={savedUrl} value={value} onChange={onChange} />;
}
