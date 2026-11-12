const express = require("express");
const controller = require("./auth.controller");
const authenticate = require("./auth.middleware");
const upload = require("../shared/upload.middleware");

const router = express.Router();

router.post("/register", controller.register);
router.post("/login", controller.login);

router.get("/me", authenticate, controller.me);

// A autenticação roda ANTES do upload: garante que apenas o usuário autenticado
// possa enviar uma foto e que ela seja vinculada ao ID extraído do JWT (req.user.id).
router.post(
  "/me/image",
  authenticate,
  upload.single("image"),
  controller.uploadImage
);

module.exports = router;
