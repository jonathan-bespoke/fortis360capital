import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const senhaHash = await bcrypt.hash('Admin@123', 12)

  await prisma.user.upsert({
    where: { email: 'admin@fortis360.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@fortis360.com',
      senhaHash,
      role: Role.admin,
      senhaTrocadaNoPrimeiroAcesso: true,
    },
  })

  console.log('Seed concluído. Admin: admin@fortis360.com / Admin@123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
