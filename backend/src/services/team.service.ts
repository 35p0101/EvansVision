import prisma from "../models";

export class TeamService {
  async getAll() {
    return prisma.team.findMany({
      include: { statistics: true },
      orderBy: { name: "asc" },
    });
  }

  async getById(id: string) {
    return prisma.team.findUnique({
      where: { id },
      include: {
        statistics: true,
        homeMatches: {
          take: 10,
          orderBy: { date: "desc" },
          include: {
            awayTeam: { select: { id: true, name: true, logo: true } },
          },
        },
        awayMatches: {
          take: 10,
          orderBy: { date: "desc" },
          include: {
            homeTeam: { select: { id: true, name: true, logo: true } },
          },
        },
      },
    });
  }

  async getWithStats() {
    return prisma.team.findMany({
      include: { statistics: true },
      orderBy: { eloRating: "desc" },
    });
  }
}
