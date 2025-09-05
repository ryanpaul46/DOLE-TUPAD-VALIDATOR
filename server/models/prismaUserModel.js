import prisma from '../lib/prisma.js';

export const createUser = async (userData) => {
  return await prisma.user.create({
    data: userData
  });
};

export const findUserByUsername = async (username) => {
  return await prisma.user.findUnique({
    where: { username }
  });
};

export const findUserByEmail = async (email) => {
  return await prisma.user.findUnique({
    where: { email }
  });
};

export const getAllUsers = async () => {
  return await prisma.user.findMany({
    select: {
      id: true,
      first_name: true,
      last_name: true,
      username: true,
      email: true,
      role: true,
      created_at: true
    }
  });
};

export const deleteUser = async (id) => {
  return await prisma.user.delete({
    where: { id: parseInt(id) }
  });
};