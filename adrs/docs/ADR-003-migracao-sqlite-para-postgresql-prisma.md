# ADR-003 - Migração de SQLite para PostgreSQL com Prisma

## Status
Aceita

## Data
03/09/2026

## Responsável
Equipe EasyFood

## Contexto
A ADR-002 registrou a adoção de SQLite (via `node:sqlite`) como mecanismo de persistência da
EasyFood, resolvendo o problema de perda de dados ao reiniciar o servidor identificado na
Sprint 03.

O material desta aula (Arquitetura em Camadas) usa Prisma + PostgreSQL como par de tecnologias
de referência para ensinar organização em camadas (database/service/controller/routes) e uso de
um ORM. Além disso, o próximo passo do projeto - autenticação de usuários - vai exigir modelar
uma nova entidade (usuários) e, no futuro, relacionamentos entre entidades, algo que a própria
ADR-001 já apontava como critério de revisão da decisão de usar um armazenamento simples.

## Alternativas consideradas
1. Manter SQLite via `node:sqlite` (ADR-002) e adaptar apenas a organização em camadas.
2. Migrar para PostgreSQL com Prisma, seguindo o material de referência da disciplina.
3. Migrar para MongoDB.
4. Migrar para PostgreSQL usando um driver puro (`pg`), sem ORM.

## Decisão
Migrar o mecanismo de persistência da EasyFood de SQLite (`node:sqlite`) para PostgreSQL,
acessado através do ORM Prisma, seguindo a estrutura da camada `database` proposta nesta aula.

## Justificativa
- Alinha o projeto ao material de referência da disciplina, que usa Prisma + PostgreSQL para ensinar arquitetura em camadas e ORMs.
- PostgreSQL é um banco cliente-servidor real, mais próximo do que seria usado em produção do que um arquivo SQLite local.
- O Prisma oferece migrations versionadas (`prisma migrate`), um schema declarativo como fonte única de verdade, e consultas tipadas - ganhos de produtividade e segurança em relação a escrever SQL manualmente.
- Facilita modelar relacionamentos entre entidades (ex: usuários, restaurantes), que o módulo de autenticação já vai precisar.

## Consequências

### Positivas
- Persistência real em um banco cliente-servidor, mais próximo de um cenário de produção.
- Migrations organizadas e versionadas, com histórico de mudanças no schema.
- Facilidade para modelar relacionamentos entre entidades no futuro (ex: restaurante pertence a um usuário).
- Código de acesso a dados mais legível através do Prisma Client, sem SQL manual espalhado pela aplicação.

### Negativas
- Voltamos a depender de infraestrutura externa (um servidor PostgreSQL rodando local, em Docker ou na nuvem) - exatamente o que a ADR-002 evitava deliberadamente naquela fase.
- Nova etapa de build/geração de código: é preciso rodar `npx prisma generate` sempre que o schema muda.
- Curva de aprendizado adicional do Prisma (schema, migrations, client).
- Os dados que estavam no `easyfood.db` (SQLite) deixam de ser usados; precisam ser recriados/re-seedados no PostgreSQL.

## Critérios de revisão
Esta decisão deverá ser reavaliada quando:
1. O custo/complexidade de manter um servidor PostgreSQL disponível deixar de valer a pena para a fase do projeto.
2. Surgir necessidade de um banco não relacional (dados semiestruturados) que se encaixe melhor em MongoDB.
3. O time optar por um provedor de PostgreSQL totalmente gerenciado (ex: Neon, Supabase, Prisma Postgres) em vez de uma instância própria.

## Notas
Esta decisão substitui a ADR-002 como mecanismo de persistência ativo. A ADR-002 permanece
registrada no histórico do projeto para documentar por que SQLite foi a escolha correta naquele
momento (fase inicial de prototipação).
