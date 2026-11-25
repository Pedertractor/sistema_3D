import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { UnitToggle } from '@/components/UnitToggle';
import { useAuth } from '@/contexts/useAuth';
import { apiErrorMessage } from '@/lib/api-error';
import { ROUTES } from '@/routes/constants';
import { authApi } from '@/services/auth';
import type { Unit } from '@/types/auth';

function ChangePasswordStep() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 6) return toast.error('A nova senha deve ter ao menos 6 caracteres');
    if (newPassword !== confirm) return toast.error('As senhas não coincidem');
    setSaving(true);
    try {
      const updated = await authApi.changePassword({ newPassword });
      updateUser(updated);
      toast.success('Senha alterada');
      navigate(ROUTES.FILA, { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Defina sua senha</CardTitle>
        <CardDescription>Olá, {user?.name}. Crie uma senha nova para continuar.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup className='gap-4'>
            <Field>
              <FieldLabel htmlFor='new'>Nova senha</FieldLabel>
              <Input id='new' type='password' value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </Field>
            <Field>
              <FieldLabel htmlFor='confirm'>Confirmar nova senha</FieldLabel>
              <Input id='confirm' type='password' value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </Field>
            <Field orientation='horizontal'>
              <Button type='submit' disabled={saving} className='flex-1'>
                {saving ? 'Salvando…' : 'Salvar e entrar'}
              </Button>
              <Button type='button' variant='ghost' onClick={logout}>
                Sair
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

export function LoginForm() {
  const { login, isLoading, user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cardNumber, setCardNumber] = useState('');
  const [unit, setUnit] = useState<Unit>('PEDERTRACTOR');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (isLoggedIn && user?.mustChangePassword) {
    return <ChangePasswordStep />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await login({ cardNumber, unit, password });
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from && from !== ROUTES.LOGIN ? from : ROUTES.FILA, {
        replace: true,
      });
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível entrar'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Acesso da equipe de impressão 3D</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup className='gap-4'>
            <div className='grid grid-cols-[1fr_auto] gap-3'>
              <Field>
                <FieldLabel htmlFor='card'>Cartão</FieldLabel>
                <Input id='card' inputMode='numeric' value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} required />
              </Field>
              <Field>
                <FieldLabel>Unidade</FieldLabel>
                <UnitToggle value={unit} onChange={setUnit} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor='password'>Senha</FieldLabel>
              <Input id='password' type='password' value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            {error && <p className='text-sm text-destructive'>{error}</p>}
            <Button type='submit' disabled={isLoading}>
              {isLoading ? 'Entrando…' : 'Entrar'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
