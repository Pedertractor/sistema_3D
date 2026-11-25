import 'dotenv/config';
import bcrypt from 'bcrypt';
import { $Enums } from '../src/generated/prisma/client.js';
import {
  BOOTSTRAP_ADMIN_CARD,
  BOOTSTRAP_ADMIN_ROLE,
  BOOTSTRAP_ADMIN_UNIT,
} from '../src/auth/bootstrap-admin.js';
import { prisma } from '../src/lib/prisma.js';

type SeedAdmin = { name: string; cardNumber: string; unit: $Enums.Unit };

/** Admins garantidos a cada execução do seed. Senha inicial = número do cartão. */
const SEED_ADMINS: SeedAdmin[] = [
  { name: 'Admin Local', cardNumber: BOOTSTRAP_ADMIN_CARD, unit: BOOTSTRAP_ADMIN_UNIT },
  { name: 'Pedro Prado', cardNumber: '5487', unit: $Enums.Unit.PEDERTRACTOR },
];

async function seedAdmin({ name, cardNumber, unit }: SeedAdmin) {
  const existing = await prisma.user.findUnique({
    where: { cardNumber_unit: { cardNumber, unit } },
  });

  if (existing) {
    // Não sobrescreve a senha de quem já trocou; só garante papel e acesso.
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: BOOTSTRAP_ADMIN_ROLE, active: true },
    });
    console.log(`Seed: admin ${cardNumber}/${unit} já existe (papel garantido).`);
    return;
  }

  await prisma.user.create({
    data: {
      name,
      cardNumber,
      unit,
      role: BOOTSTRAP_ADMIN_ROLE,
      passwordHash: await bcrypt.hash(cardNumber, 10),
      mustChangePassword: true,
    },
  });
  console.log(`Seed: admin ${cardNumber}/${unit} criado (senha inicial = cartão).`);
}

async function main() {
  for (const admin of SEED_ADMINS) {
    await seedAdmin(admin);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
