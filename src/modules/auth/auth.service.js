const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const prisma = require("../../database/prisma");
const imageService = require("../shared/image.service");

const JWT_SECRET = process.env.JWT_SECRET;

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    imageUrl: user.imageUrl || null
  };
}

async function register({ name, email, password }) {
  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, password: hash }
  });

  return toPublicUser(user);
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    return null;
  }

  const senhaConfere = await bcrypt.compare(
    password,
    user.password
  );

  if (!senhaConfere) {
    return null;
  }

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email
    },
    JWT_SECRET,
    {
      expiresIn: "1d"
    }
  );

  return {
    token,
    user: toPublicUser(user)
  };
}

async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: {
      id: Number(userId)
    }
  });

  if (!user) {
    const error = new Error("Usuário não encontrado");
    error.statusCode = 404;
    throw error;
  }

  return toPublicUser(user);
}

async function uploadProfileImage(userId, buffer) {
  const user = await prisma.user.findUnique({
    where: {
      id: Number(userId)
    }
  });

  if (!user) {
    const error = new Error("Usuário não encontrado");
    error.statusCode = 404;
    throw error;
  }

  const previousImageUrl = user.imageUrl;

  // Reutiliza o serviço compartilhado de imagens (Multer + Sharp -> WebP)
  const imageUrl = await imageService.optimizeImage(
    buffer,
    "users"
  );

  const updatedUser = await prisma.user.update({
    where: {
      id: Number(userId)
    },
    data: {
      imageUrl
    }
  });

  // Remove a foto de perfil anterior do disco somente após persistir a nova no banco
  await imageService.removeImage(previousImageUrl);

  return toPublicUser(updatedUser);
}

module.exports = {
  register,
  login,
  getProfile,
  uploadProfileImage
};
