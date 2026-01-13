<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e
# Testing Notes

- In `NODE_ENV=test`, the global throttling guard is disabled to prevent `429 Too Many Requests` during e2e runs.
- Use the root scripts for convenience:
  - `npm run test:api` (unit)
  - `npm run test:api:e2e` (ensure DB + migrations + e2e)
  - `npm run test:api:e2e:detect` (e2e with Jest `--detectOpenHandles`).


# test coverage
$ npm run test:cov
```

## Local Database & E2E

This project uses Prisma 7 with the pg driver adapter. End-to-end tests and local runs need a Postgres instance and `DATABASE_URL`.

### Start Postgres via Docker Compose (recommended)

From the repo root where `docker-compose.yml` lives:

```bash
# bring up Postgres (detached)
npm run compose:up

# check status
npm run compose:ps
```

### Prepare DB and run e2e tests

```bash
cd quizmaster-api

# Apply migrations to the local DB
npx prisma migrate deploy

# Run e2e tests (Jest will default DATABASE_URL to local if unset)
npm run test:e2e
```

To stop and remove the container and volume:

```bash
npm run compose:down
```

### DB Ensure (Monorepo Convenience)

From the repo root, you can use a convenience script that detects a local Postgres on `localhost:5432` and skips Docker Compose when one is already running. Otherwise, it will start the `postgres` service and wait for it to become healthy:

```bash
npm run db:ensure
```

Additional helpers from the root:

```bash
npm run compose:up     # start the compose 'postgres' service
npm run compose:ps     # check compose service status
npm run compose:down   # stop and remove the compose service & volume
```

### Node & Prisma

- Node: 20.19.x LTS or newer (see engines in package.json)
- Prisma: v7.x — connection string is read via `prisma.config.ts` and environment
- Runtime: `PrismaClient` is constructed with the pg adapter and uses `DATABASE_URL`

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

### Health Endpoints

- `GET /health` — Dependency health check (includes database ping).
- `GET /health/ready` — Readiness signal (lightweight OK payload).
- `GET /health/live` — Liveness signal (minimal OK payload; no dependency checks).

These endpoints are unauthenticated and intended for platform probes.

### Quizzes Routes

- `POST /quizzes` — Create quiz (Teacher/Admin)
- `PUT /quizzes/:id` — Update quiz (Owner/Admin)
- `PATCH /quizzes/:id` — Partial update (Owner/Admin)
- `DELETE /quizzes/:id` — Soft delete quiz (Owner/Admin)

### Render PostgreSQL SSL

If deploying to Render with managed PostgreSQL, ensure your `DATABASE_URL` includes `?sslmode=require` to enforce encrypted connections, for example:

```
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB?sslmode=require
```

Prisma respects SSL settings provided via the connection string. No additional code changes are necessary.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
