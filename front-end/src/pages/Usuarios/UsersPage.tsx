import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/PageHeader';
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
import { usersApi } from '@/services/users';
import { USER_ROLES, type Unit, type UserRole } from '@/types/auth';
import { formattedRoles, UNIT_LABELS } from '@/utils/roles';

function NewUserDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [unit, setUnit] = useState<Unit>('PEDERTRACTOR');
  const [role, setRole] = useState<UserRole>('OPERATOR');

  const mutation = useMutation({
    mutationFn: () => usersApi.create({ name, cardNumber, unit, role }),
    onSuccess: () => {
      toast.success('Usuário criado. Senha inicial = número do cartão.');
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <AppDialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>A senha inicial é o número do cartão; a troca é obrigatória no 1º acesso.</DialogDescription>
          </DialogHeader>
          <FieldGroup className='py-4'>
            <Field>
              <FieldLabel htmlFor='uname'>Nome *</FieldLabel>
              <Input id='uname' value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field>
                <FieldLabel htmlFor='ucard'>Cartão *</FieldLabel>
                <Input id='ucard' value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} required />
              </Field>
              <Field>
                <FieldLabel>Unidade</FieldLabel>
                <UnitToggle value={unit} onChange={setUnit} />
              </Field>
            </div>
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
            <Button type='submit' disabled={mutation.isPending}>
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
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['users'] }),
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
                <TableHead className='pl-4'>Nome</TableHead>
                <TableHead>Cartão</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className='pr-4' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className='py-8 text-center text-muted-foreground'>
                    Carregando…
                  </TableCell>
                </TableRow>
              )}
              {users.map((u) => {
                const isMe = u.id === me?.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell className='pl-4'>
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
                        disabled={isMe}
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
                        disabled={isMe}
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
