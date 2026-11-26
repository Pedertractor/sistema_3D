import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Paperclip, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ROUTES, trackPath } from '@/routes/constants';
import { publicApi } from '@/services/public';
import type { Unit } from '@/types/auth';
import { PublicShell, publicCardClass } from './PublicShell';
import { MaterialPicker } from './MaterialPicker';
import { ProductionLinkField } from './ProductionLinkField';
import { EMPTY_PRODUCTION_LINK, isProductionLinkReady, type ProductionLink } from './production-link';
import { EMPTY_MATERIAL, type MaterialChoice } from './material-choice';
import { RequesterIdentification } from './RequesterIdentification';
import { EMPTY_REQUESTER, toRequester, type RequesterState } from './requester-state';

const ACCEPTED_FILES = 'image/*,.stl,.step,.stp,.obj,.3mf,.iges,.igs,.pdf';

export function PrototypeRequestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as { partNumber?: string; cardNumber?: string; unit?: Unit; email?: string } | null;
  const fromPartNumber = navState?.partNumber;

  // Veio da produção ("sem item para esta peça"): já leva o cartão/unidade/e-mail digitados lá, sem pedir de novo.
  const [requester, setRequester] = useState<RequesterState>(() => ({
    ...EMPTY_REQUESTER,
    cardNumber: navState?.cardNumber?.trim() || EMPTY_REQUESTER.cardNumber,
    unit: navState?.unit ?? EMPTY_REQUESTER.unit,
    email: navState?.email ?? EMPTY_REQUESTER.email,
  }));
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [material, setMaterial] = useState<MaterialChoice>(EMPTY_MATERIAL);
  // Veio da produção ("sem item para esta peça"): já marca como item de produção com o partnumber.
  const [productionLink, setProductionLink] = useState<ProductionLink>(
    fromPartNumber ? { forProduction: true, partNumberInput: fromPartNumber, lookup: null } : EMPTY_PRODUCTION_LINK,
  );
  const { data: filaments = [], isLoading: loadingFilaments } = useQuery({
    queryKey: ['public-filaments'],
    queryFn: publicApi.filaments,
  });
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const submit = useMutation({
    mutationFn: () =>
      publicApi.createPrototype(
        { ...toRequester(requester), itemName, quantity: Number(quantity), rigidity: material.rigidity!, colorName: material.colorName!,
          partNumber: productionLink.forProduction ? productionLink.lookup!.part.partNumber : null,
          description,
        },
        files,
      ),
    onSuccess: (data) => navigate(trackPath(data.trackingCode), { state: { created: true } }),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!requester.identity) return toast.error('Identifique-se com o cartão e a unidade');
    if (!material.rigidity) return toast.error('Escolha se o material é rígido ou maleável');
    if (!material.colorName) return toast.error('Escolha a cor');
    if (productionLink.forProduction === null) return toast.error('Informe se vai ser um item de produção');
    if (!isProductionLinkReady(productionLink)) return toast.error('Verifique o partnumber do item de produção');
    submit.mutate();
  };

  return (
    <PublicShell backTo={ROUTES.SOLICITACAO}>
      <div>
        <h1 className='text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl'>Solicitação de prototipagem</h1>
        <p className='text-muted-foreground'>
          Para peças novas ou que ainda não têm item cadastrado. Descreva o que precisa e anexe foto ou sólido.
        </p>
      </div>

      <form onSubmit={onSubmit} className='flex flex-col gap-4 [&>*]:shrink-0'>
        <Card className={publicCardClass}>
          <CardHeader>
            <CardTitle className='text-base'>1. Identificação</CardTitle>
            <CardDescription>Informe seu cartão e a unidade. Conferimos seus dados no cadastro da empresa.</CardDescription>
          </CardHeader>
          <CardContent>
            <RequesterIdentification value={requester} onChange={setRequester} />
          </CardContent>
        </Card>
        <Card className={publicCardClass}>
          <CardHeader>
            <CardTitle className='text-base'>2. Item</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className='grid gap-4 sm:grid-cols-[1fr_10rem]'>
                <Field>
                  <FieldLabel htmlFor='itemName'>Nome *</FieldLabel>
                  <Input id='itemName' value={itemName} onChange={(e) => setItemName(e.target.value)} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor='quantity'>Quantidade desejada *</FieldLabel>
                  <Input id='quantity' type='number' min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
                </Field>
              </div>
              <Field>
                <FieldLabel>Material *</FieldLabel>
                {loadingFilaments ? (
                  <p className='text-sm text-muted-foreground'>Carregando materiais…</p>
                ) : filaments.length === 0 ? (
                  <p className='rounded-md border border-dashed p-3 text-sm text-muted-foreground'>
                    Nenhum material disponível no momento. Fale com a equipe de impressão 3D.
                  </p>
                ) : (
                  <MaterialPicker filaments={filaments} value={material} onChange={setMaterial} />
                )}
              </Field>
              <Field>
                <FieldLabel>Vai ser um item de produção? *</FieldLabel>
                <ProductionLinkField value={productionLink} onChange={setProductionLink} />
              </Field>
              <Field>
                <FieldLabel htmlFor='description'>Descrição *</FieldLabel>
                <Textarea
                  id='description'
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder='Onde será usado, medidas importantes, observações…'
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor='files'>Arquivo auxiliar (foto ou sólido)</FieldLabel>
                <Input
                  id='files'
                  type='file'
                  multiple
                  accept={ACCEPTED_FILES}
                  onChange={(e) => {
                    const selected = Array.from(e.target.files ?? []);
                    setFiles((prev) => [...prev, ...selected]);
                    e.target.value = '';
                  }}
                />
                <FieldDescription>Imagens, STL, STEP, OBJ, 3MF, IGES ou PDF.</FieldDescription>
                {files.length > 0 && (
                  <ul className='flex flex-col gap-1'>
                    {files.map((file, index) => (
                      <li key={`${file.name}-${index}`} className='flex items-center gap-2 text-sm'>
                        <Paperclip className='size-3 text-muted-foreground' />
                        <span className='truncate'>{file.name}</span>
                        <button
                          type='button'
                          className='text-muted-foreground hover:text-destructive'
                          onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                          aria-label={`Remover ${file.name}`}
                        >
                          <X className='size-3' />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className={publicCardClass}>
          <CardHeader>
            <CardTitle className='text-base'>3. Enviar</CardTitle>
            <CardDescription>Não precisa de login. Guarde o código gerado para acompanhar.</CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-4'>
            <Button type='submit' disabled={!requester.identity || submit.isPending}>
              {submit.isPending ? 'Enviando…' : 'Enviar solicitação'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </PublicShell>
  );
}
