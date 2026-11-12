const express = require("express");
const router = express.Router();

const dishController = require("./dish.controller");
const authMiddleware = require("../auth/auth.middleware");
const upload = require("../shared/upload.middleware");

router.get(
  "/restaurants/:restaurantId/dishes",
  dishController.list
);

router.post(
  "/restaurants/:restaurantId/dishes",
  authMiddleware,
  dishController.create
);

// A autenticação roda ANTES do upload: assim, uma requisição sem token
// é rejeitada sem sequer receber o arquivo.
router.post(
  "/dishes/:dishId/image",
  authMiddleware,
  upload.single("image"),
  dishController.uploadImage
);

module.exports = router;
