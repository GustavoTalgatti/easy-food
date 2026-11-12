const dishService = require("./dish.service");

const MAX_PRICE = 99999999.99; // limite de Decimal(10, 2)

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function create(req, res) {
  try {
    const restaurantId = parseId(req.params.restaurantId);

    if (!restaurantId) {
      return res.status(400).json({
        error: "Identificador de restaurante inválido"
      });
    }

    const { name, description, price } = req.body || {};

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        error: "Nome do prato é obrigatório"
      });
    }

    const numericPrice =
      price === undefined || price === null || price === ""
        ? NaN
        : Number(price);

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice < 0 ||
      numericPrice > MAX_PRICE
    ) {
      return res.status(400).json({
        error: "Preço inválido. Informe um número maior ou igual a zero"
      });
    }

    if (description !== undefined && typeof description !== "string") {
      return res.status(400).json({
        error: "Descrição inválida"
      });
    }

    const dish = await dishService.createDish(
      restaurantId,
      {
        name: name.trim(),
        description: (description || "").trim(),
        price: numericPrice
      }
    );

    return res.status(201).json(dish);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.statusCode
        ? error.message
        : "Erro interno ao cadastrar prato"
    });
  }
}

async function list(req, res) {
  try {
    const restaurantId = parseId(req.params.restaurantId);

    if (!restaurantId) {
      return res.status(400).json({
        error: "Identificador de restaurante inválido"
      });
    }

    const dishes = await dishService.listDishes(
      restaurantId
    );

    return res.json(dishes);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao consultar pratos"
    });
  }
}

async function uploadImage(req, res) {
  try {
    const dishId = parseId(req.params.dishId);

    if (!dishId) {
      return res.status(400).json({
        error: "Identificador de prato inválido"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "Nenhuma imagem enviada"
      });
    }

    const dish = await dishService.uploadDishImage(
      dishId,
      req.file.buffer
    );

    return res.json(dish);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.statusCode
        ? error.message
        : "Erro ao processar imagem"
    });
  }
}

module.exports = {
  create,
  list,
  uploadImage
};
