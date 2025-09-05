import prisma from '../lib/prisma.js';

export const createBeneficiary = async (data) => {
  return await prisma.uploadedBeneficiary.create({ data });
};

export const createManyBeneficiaries = async (data) => {
  return await prisma.uploadedBeneficiary.createMany({ data });
};

export const getAllBeneficiaries = async () => {
  return await prisma.uploadedBeneficiary.findMany({
    orderBy: { id: 'desc' }
  });
};

export const getBeneficiariesByProjectSeries = async () => {
  const result = await prisma.uploadedBeneficiary.groupBy({
    by: ['project_series'],
    _count: {
      id: true
    },
    where: {
      project_series: { not: null }
    }
  });
  
  return result.map(item => ({
    project_series: item.project_series,
    beneficiary_count: item._count.id
  }));
};

export const deleteAllBeneficiaries = async () => {
  return await prisma.uploadedBeneficiary.deleteMany();
};

export const deleteBeneficiariesByProjectSeries = async (projectSeries) => {
  return await prisma.uploadedBeneficiary.deleteMany({
    where: { project_series: projectSeries }
  });
};

export const searchBeneficiaries = async (filters, pagination) => {
  const { search, province, sex, minAge, maxAge, projectSeries } = filters;
  const { page, limit } = pagination;
  
  const where = {};
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { id_number: { contains: search, mode: 'insensitive' } },
      { province: { contains: search, mode: 'insensitive' } },
      { city_municipality: { contains: search, mode: 'insensitive' } },
      { project_series: { contains: search, mode: 'insensitive' } }
    ];
  }
  
  if (province) where.province = { contains: province, mode: 'insensitive' };
  if (sex) where.sex = sex;
  if (minAge) where.age = { ...where.age, gte: parseInt(minAge) };
  if (maxAge) where.age = { ...where.age, lte: parseInt(maxAge) };
  if (projectSeries) where.project_series = { contains: projectSeries, mode: 'insensitive' };
  
  const [results, total] = await Promise.all([
    prisma.uploadedBeneficiary.findMany({
      where,
      orderBy: { id: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.uploadedBeneficiary.count({ where })
  ]);
  
  return { results, total };
};

export const getStatistics = async () => {
  const [
    totalBeneficiaries,
    totalUsers,
    provinces,
    projectSeries,
    genderDistribution,
    ageStats
  ] = await Promise.all([
    prisma.uploadedBeneficiary.count(),
    prisma.user.count(),
    prisma.uploadedBeneficiary.groupBy({
      by: ['province'],
      _count: { id: true },
      where: { province: { not: null } },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.uploadedBeneficiary.groupBy({
      by: ['project_series'],
      _count: { id: true },
      where: { project_series: { not: null } },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.uploadedBeneficiary.groupBy({
      by: ['sex'],
      _count: { id: true },
      where: { sex: { not: null } },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.uploadedBeneficiary.aggregate({
      _avg: { age: true },
      _min: { age: true },
      _max: { age: true },
      where: { age: { gt: 0 } }
    })
  ]);
  
  return {
    totalBeneficiaries,
    totalUsers,
    totalProjectSeries: projectSeries.length,
    provinces: provinces.map(p => ({ province: p.province, count: p._count.id })),
    projectSeries: projectSeries.map(p => ({ project_series: p.project_series, count: p._count.id })),
    genderDistribution: genderDistribution.map(g => ({ sex: g.sex, count: g._count.id })),
    ageStats: {
      avg_age: ageStats._avg.age,
      min_age: ageStats._min.age,
      max_age: ageStats._max.age
    }
  };
};