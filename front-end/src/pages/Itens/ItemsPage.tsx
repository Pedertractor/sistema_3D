import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatGrams, formatMinutes } from '@/lib/format';
import { requestDetailPath } from '@/routes/constants';
import { itemsApi, type Item } from '@/services/items';
import { FilamentTag } from '@/components/FilamentDisplay';
import { ItemFormDialog } from './ItemFormDialog';

export function ItemsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<{ open: boolean; item: Item | null }>({ open: false, item: null });
  const { data: items = [], isLoading } = useQuery({ queryKey: ['items', search], queryFn: () => itemsApi.list(search) });

  const toggleActive = useMutation({
    mutationFn: (item: Item) => itemsApi.update(item.id, { active: !item.active }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['items'] }),
  });

  return (
    <div className='flex flex-col gap-4'>
      <PageHeader
        title='Itens'
        description='Cada item pode atender vários partnumbers. Só itens ativos aparecem para o solicitante.'
        actions={
          <Button onClick={() => setDialog({ open: true, item: null })}>
            <Plus /> Registrar item
          </Button>
        }
      />

      <div className='relative max-w-md'>
        <Search className='absolute top-2.5 left-2.5 size-4 text-muted-foreground' />
        <Input className='pl-8' placeholder='Código, nome ou partnumber' value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className='py-0'>
        <CardContent className='px-0'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='pl-4'>Item</TableHead>
                <TableHead>Filamento</TableHead>
                <TableHead>Por unidade</TableHead>
                <TableHead>Por impressão</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className='pr-4' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className='py-8 text-center text-muted-foreground'>
                    Carregando…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className='py-8 text-center text-muted-foreground'>
                    Nenhum item encontrado.
                  </TableCell>
                </TableRow>
              )}
              {items.map((item) => (
                <TableRow key={item.id} className='align-top'>
                  <TableCell className='pl-4'>
                    <p className='font-medium'>{item.code}</p>
                    <p className='text-sm'>{item.name}</p>
                    {item.originRequest && (
                      <Link to={requestDetailPath(item.originRequest.id)} className='text-xs text-muted-foreground underline'>
                        de {item.originRequest.trackingCode}
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className='text-sm'>
                    <FilamentTag filament={item.filament} />
                  </TableCell>
                  <TableCell className='text-sm'>
                    {formatGrams(item.gramsPerUnit)}
                    <p className='text-xs text-muted-foreground'>{formatMinutes(item.printMinutesPerUnit)}</p>
                  </TableCell>
                  <TableCell className='text-sm'>
                    {item.unitsPerPrint} un
                    <p className='text-xs text-muted-foreground'>
                      {formatMinutes(item.printMinutesPerUnit * item.unitsPerPrint)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Switch checked={item.active} onCheckedChange={() => toggleActive.mutate(item)} />
                  </TableCell>
                  <TableCell className='pr-4'>
                    <Button size='icon' variant='ghost' onClick={() => setDialog({ open: true, item })}>
                      <Pencil />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {dialog.open && (
        <ItemFormDialog
          key={dialog.item?.id ?? 'new'}
          open={dialog.open}
          item={dialog.item}
          onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
        />
      )}
    </div>
  );
}
