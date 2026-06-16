interface PrismaClientConstructor {
  new (): {
    workspaceSession: {
      findUnique: (args: unknown) => Promise<unknown>;
      update: (args: unknown) => Promise<unknown>;
    };
  };
}

type PrismaClientLike = InstanceType<PrismaClientConstructor>;

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClientLike;
};

export async function getPrismaClient(): Promise<PrismaClientLike> {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  try {
    const packageName = "@prisma/client";
    const prismaModule = await import(packageName) as {
      PrismaClient: PrismaClientConstructor;
    };

    const client = new prismaModule.PrismaClient();
    globalForPrisma.prisma = client;

    return client;
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message.includes("@prisma/client")
        ? "Prisma client is not installed/generated. Install prisma dependencies and run prisma generate before using /api/chat."
        : "Could not initialize Prisma client."
    );
  }
}
