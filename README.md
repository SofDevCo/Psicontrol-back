# Psicontrol Back-end

API RESTful para suporte ao ecossistema Psicontrol, gerenciando autenticação, automações e persistência de dados.

## Tecnologias
- Node.js
- NestJS
- PostgreSQL
- Prisma ORM
- Redis

## Como rodar localmente
1. Clone o repositório: `git clone <url>`
2. Instale as dependências: `npm install`
3. Configure o banco de dados via Docker: `docker-compose up -d`
4. Execute as migrações: `npx prisma migrate dev`
5. Inicie o servidor: `npm run start:dev`

## Features
- Autenticação JWT
- Automação de cobranças via Webhooks
- Integração com APIs de WhatsApp e E-mail

## Repositórios Relacionados
- [Front-end](https://github.com/psicontrol/psicontrol-front)
- [Landing Page](https://github.com/psicontrol/landing-page)

---
