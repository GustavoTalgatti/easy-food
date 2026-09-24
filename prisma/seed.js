const prisma = require("../src/database/prisma");

async function main() {
  const count = await prisma.restaurant.count();

  if (count === 0) {
    await prisma.restaurant.createMany({
      data: [
        { name: "Pizzaria Napoli", category: "Pizza", rating: 4.8 },
        { name: "Burger House", category: "Hambúrguer", rating: 4.7 },
        { name: "Sushi House", category: "Japonês", rating: 4.9 }
      ]
    });
    console.log("Seed concluído: 3 restaurantes criados.");
  } else {
    console.log("Seed ignorado: já existem restaurantes no banco.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
