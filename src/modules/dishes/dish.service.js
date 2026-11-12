const prisma = require("../../database/prisma");
const imageService = require("../shared/image.service");

async function createDish(restaurantId, data) {
  const restaurant = await prisma.restaurant.findUnique({
    where: {
      id: Number(restaurantId)
    }
  });

  if (!restaurant) {
    const error = new Error("Restaurante não encontrado");
    error.statusCode = 404;
    throw error;
  }

  const dish = await prisma.dish.create({
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      restaurantId: Number(restaurantId)
    }
  });

  return dish;
}

async function listDishes(restaurantId) {
  return prisma.dish.findMany({
    where: {
      restaurantId: Number(restaurantId)
    }
  });
}

async function uploadDishImage(dishId, buffer) {
  const dish = await prisma.dish.findUnique({
    where: {
      id: Number(dishId)
    }
  });

  if (!dish) {
    const error = new Error("Prato não encontrado");
    error.statusCode = 404;
    throw error;
  }

  const previousImageUrl = dish.imageUrl;

  // O prato já existe. Se o processamento da imagem falhar, o erro sobe,
  // mas o prato continua cadastrado (sem imagem) e o upload pode ser repetido.
  const imageUrl = await imageService.optimizeImage(
    buffer,
    "dishes"
  );

  const updatedDish = await prisma.dish.update({
    where: {
      id: Number(dishId)
    },
    data: {
      imageUrl
    }
  });

  // Só depois de gravar a nova imagem removemos a anterior (se existia)
  await imageService.removeImage(previousImageUrl);

  return updatedDish;
}

module.exports = {
  createDish,
  listDishes,
  uploadDishImage
};
