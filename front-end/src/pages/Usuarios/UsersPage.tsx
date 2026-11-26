import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, CircleCheck, KeyRound, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/PageHeader';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AppDialogContent } from '@/components/AppDialogContent';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { UnitToggle } from '@/components/UnitToggle';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/useAuth';
import { apiErrorMessage } from '@/lib/api-error';
import { publicApi, type RequesterIdentity } from '@/services/public';
import { usersApi } from '@/services/users';
import { USER_ROLES, type ListUser, type Unit, type UserRole } from '@/types/auth';
import { formattedRoles, UNIT_LABELS } from '@/utils/roles';

/** Iniciais do nome + sobrenome, ex.: "Vanderlei Junior" -> "VJ". */
function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = parts[0]![0];
  const last = parts[parts.length - 1]![0];
  return (parts.length > 1 ? first + last : first).toUpperCase();
}

/** Cartão completo o bastante para consultar (4 dígitos ou mais) — mesma regra da identificação de solicitação. */
const CARD_READY = /^\d{4,10}$/;
/** Espera o usuário parar de digitar antes de consultar a API. */
const LOOKUP_DELAY_MS = 400;

function NewUserDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<UserRole>('OPERATOR');
  const [state, setState] = useState<{ cardNumber: string; unit: Unit; identity: RequesterIdentity | null }>({
    cardNumber: '',
    unit: 'PEDERTRACTOR',
    identity: null,
  });
  const { cardNumber, unit, identity } = state;

  const lookup = useMutation({
    mutationFn: (vars: { cardNumber: string; unit: Unit }) => publicApi.identifyRequester(vars.unit, vars.cardNumber),
    // Só aplica se o cartão/unidade ainda forem os mesmos (o usuário pode ter digitado de novo nesse meio tempo).
    onSuccess: (found, vars) =>
      setState((prev) => (prev.cardNumber === vars.cardNumber && prev.unit === vars.unit ? { ...prev, identity: found } : prev)),
  });

  const trimmedCard = cardNumber.trim();
  useEffect(() => {
    if (!CARD_READY.test(trimmedCard)) return;
    const timer = setTimeout(() => lookup.mutate({ cardNumber: trimmedCard, unit }), LOOKUP_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmedCard, unit]);

  // Qualquer mudança no cartão ou na unidade invalida a identificação anterior.
  const update = (patch: Partial<{ cardNumber: string; unit: Unit }>) => {
    lookup.reset();
    setState((prev) => ({ ...prev, ...patch, identity: null }));
  };

  const lookupError = lookup.isError && !identity ? apiErrorMessage(lookup.error, 'Não foi possível consultar o colaborador') : null;

  const mutation = useMutation({
    mutationFn: () => usersApi.create({ cardNumber: identity!.cardNumber, unit: identity!.unit, role }),
    onSuccess: () => {
      toast.success('Usuário criado. Senha inicial = número do cartão.');
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!identity) return toast.error('Busque o colaborador pelo cartão e unidade antes de criar');
    mutation.mutate();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <AppDialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>
              Busca pelo cartão e unidade na API corporativa; nome e identificador vêm de lá. Senha inicial = número do
              cartão.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className='py-4'>
            <div className='grid gap-4 sm:grid-cols-[1fr_auto]'>
              <Field>
                <FieldLabel htmlFor='ucard'>Cartão *</FieldLabel>
                <div className='relative'>
                  <Input
                    id='ucard'
                    inputMode='numeric'
                    autoComplete='off'
                    value={cardNumber}
                    onChange={(e) => update({ cardNumber: e.target.value.replace(/\D/g, '') })}
                    className='pr-10'
                    required
                  />
                  {lookup.isPending && (
                    <Loader2
                      className='absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground'
                      aria-label='Buscando colaborador'
                    />
                  )}
                </div>
              </Field>
              <Field>
                <FieldLabel>Unidade</FieldLabel>
                <UnitToggle value={unit} onChange={(next) => update({ unit: next })} />
              </Field>
            </div>

            {identity && (
              <div role='status' className='flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4'>
                <CircleCheck className='mt-0.5 size-5 shrink-0 text-emerald-700' />
                <div className='min-w-0 text-sm'>
                  <p className='font-semibold text-emerald-900'>Encontrado: {identity.name}</p>
                  {identity.sectorName && <p className='text-emerald-900/80'>Setor: {identity.sectorName}</p>}
                </div>
              </div>
            )}

            {lookupError && (
              <div role='alert' className='flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900'>
                <CircleAlert className='mt-0.5 size-5 shrink-0 text-red-700' />
                <p>{lookupError}</p>
              </div>
            )}

            <Field>
              <FieldLabel>Perfil</FieldLabel>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {formattedRoles[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              Cancelar
            </Button>
            <Button type='submit' disabled={!identity || mutation.isPending}>
              Criar
            </Button>
          </DialogFooter>
        </form>
      </AppDialogContent>
    </Dialog>
  );
}

export function UsersPage() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });

  const update = useMutation({
    mutationFn: ({ id, ...input }: { id: string; role?: UserRole; active?: boolean }) => usersApi.update(id, input),
    // Aplica a mudança na hora (não espera o round-trip) e desfaz se o servidor recusar.
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['users'] });
      const previous = queryClient.getQueryData<ListUser[]>(['users']);
      queryClient.setQueryData<ListUser[]>(['users'], (old) => old?.map((u) => (u.id === vars.id ? { ...u, ...vars } : u)));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['users'], context.previous);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
  const reset = useMutation({
    mutationFn: usersApi.resetPassword,
    onSuccess: () => toast.success('Senha redefinida para o número do cartão'),
  });

  return (
    <div className='flex flex-col gap-4'>
      <PageHeader
        title='Usuários'
        description='Equipe com acesso ao painel. Solicitantes não precisam de usuário.'
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> Novo usuário
          </Button>
        }
      />
      <Card className='py-0'>
        <CardContent className='px-0'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-12 pl-4' />
                <TableHead>Nome</TableHead>
                <TableHead>Cartão</TableHead>
                <TableHead>Perfil</TableHead>
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
              {users.map((u) => {
                const isMe = u.id === me?.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell className='pl-4'>
                      <Avatar className='size-8'>
                        <AvatarFallback className='bg-primary text-xs font-semibold text-primary-foreground'>
                          {initialsOf(u.name)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      {u.name} {isMe && <Badge variant='outline'>você</Badge>}
                      {u.mustChangePassword && (
                        <p className='text-xs text-muted-foreground'>Aguardando troca de senha</p>
                      )}
                    </TableCell>
                    <TableCell className='text-sm'>
                      {u.cardNumber} <span className='text-muted-foreground'>· {UNIT_LABELS[u.unit]}</span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        disabled={isMe || (update.isPending && update.variables?.id === u.id)}
                        onValueChange={(role) => update.mutate({ id: u.id, role: role as UserRole })}
                      >
                        <SelectTrigger className='h-8 w-40'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {USER_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {formattedRoles[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={u.active}
                        disabled={isMe || (update.isPending && update.variables?.id === u.id)}
                        title={isMe ? 'Você não pode desativar seu próprio usuário' : undefined}
                        onCheckedChange={(active) => update.mutate({ id: u.id, active })}
                      />
                    </TableCell>
                    <TableCell className='pr-4 text-right'>
                      <Button size='sm' variant='ghost' onClick={() => reset.mutate(u.id)}>
                        <KeyRound /> Resetar senha
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {creating && <NewUserDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
