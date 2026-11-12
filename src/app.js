const express = require("express");
const cors = require("cors");
const path = require("path");

const restaurantRoutes = require("./modules/restaurants/restaurant.routes");
const authRoutes = require("./modules/auth/auth.routes");
const dishRoutes = require("./modules/dishes/dish.routes");
const errorHandler = require("./modules/shared/error.middleware");

const app = express();

app.use(cors());
app.use(express.json());
app.use(
  express.static(
    path.join(__dirname, "../public")
  )
);

// Imagens otimizadas dos pratos e perfis de usuários (públicas nesta atividade)
app.use(
  "/uploads",
  express.static(
    path.resolve(process.cwd(), "uploads")
  )
);

app.use("/auth", authRoutes);
app.use("/restaurants", restaurantRoutes);
app.use(dishRoutes);

// Middleware global de erros: sempre por último
app.use(errorHandler);

module.exports = app;
