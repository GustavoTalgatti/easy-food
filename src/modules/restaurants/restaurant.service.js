const prisma = require("../../database/prisma");
const emailService = require("../shared/email.service");

const { escapeHtml } = emailService;

async function listRestaurants() {
  return prisma.restaurant.findMany();
}

async function createRestaurant(data) {
  // 1. Operação principal: salvar o restaurante no banco
  const restaurant = await prisma.restaurant.create({
    data: {
      name: data.name,
      category: data.category,
      rating: data.rating || 0
    }
  });

  // Destinatário de teste (definido no .env, nunca direto no código)
  const testRecipient = process.env.EMAIL_TEST_TO;

  // 2. Ação secundária: e-mail de boas-vindas ao restaurante.
  // Se falhar, só registramos o erro: o cadastro já foi concluído.
  try {
    await emailService.sendEmail({
      to: testRecipient,
      toName: restaurant.name,
      subject: `Bem-vindo à EasyFood, ${restaurant.name}!`,
      header: `Olá, ${escapeHtml(restaurant.name)}!`,
      body: `
        Seu restaurante foi cadastrado com sucesso
        na EasyFood.<br/>
        Categoria: ${escapeHtml(restaurant.category)}.
      `,
      footer: "Equipe EasyFood"
    });
  } catch (error) {
    console.error(
      "Erro ao enviar e-mail:",
      error.message
    );
  }

  // 3. Ação secundária: notificação ao comercial, com outro conteúdo,
  // reutilizando a mesma função sendEmail().
  try {
    await emailService.sendEmail({
      to: testRecipient,
      toName: "Comercial EasyFood",
      subject: `Novo restaurante cadastrado: ${restaurant.name}`,
      header: "Novo restaurante na plataforma",
      body: `
        Nome: ${escapeHtml(restaurant.name)}<br/>
        Categoria: ${escapeHtml(restaurant.category)}<br/>
        Avaliação: ${escapeHtml(restaurant.rating)}
      `,
      footer: "Notificação automática - EasyFood"
    });
  } catch (error) {
    console.error(
      "Erro ao notificar o comercial:",
      error.message
    );
  }

  // 4. Retorno da operação principal
  return restaurant;
}

module.exports = {
  listRestaurants,
  createRestaurant
};
