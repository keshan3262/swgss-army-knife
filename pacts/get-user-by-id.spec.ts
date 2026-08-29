import 'reflect-metadata';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { MatchersV3, PactV4, SpecificationVersion, Verifier } from '@pact-foundation/pact';
import { createApp } from '../src/create-app';

const { email, integer, like, regex } = MatchersV3;

const pactDir = path.resolve(__dirname);
const consumer = 'swgss-army-knife-client';
const provider = 'swgss-army-knife';
const pactFileName = `${consumer}-${provider}.json`;
const pactFile = path.join(pactDir, pactFileName);
const allowPactOverwrite = process.env.PACT_OVERWRITE !== '0';
const pactWriteDir = allowPactOverwrite
  ? pactDir
  : fs.mkdtempSync(path.join(os.tmpdir(), 'pact-'));

type PactDoc = {
  interactions: Array<{ description: string }>;
  metadata?: { pactSpecification?: unknown };
};

const normalizePact = (doc: PactDoc) => ({
  ...doc,
  interactions: [...doc.interactions].sort((a, b) => a.description.localeCompare(b.description)),
  metadata: { pactSpecification: doc.metadata?.pactSpecification }
});

const jsonContentType = regex(
  /^application\/json(;\s?charset=[\w-]+)?$/i,
  'application/json; charset=utf-8'
);
const problemContentType = regex(
  /^application\/problem\+json(;\s?charset=[\w-]+)?$/i,
  'application/problem+json'
);

const existingUser = {
  id: 1,
  username: 'alicesmith',
  email: 'Alice.Smith@example.com'
} as const;

const missingUserId = 999999;

const pact = new PactV4({
  consumer,
  provider,
  dir: pactWriteDir,
  spec: SpecificationVersion.SPECIFICATION_VERSION_V4,
  logLevel: 'error'
});

async function getUser(baseUrl: string, id: string | number) {
  return fetch(`${baseUrl}/users/${id}`, {
    headers: { Accept: 'application/json' }
  });
}

describe('GET /users/:id', () => {
  afterAll(() => {
    if (!allowPactOverwrite) {
      fs.rmSync(pactWriteDir, { recursive: true, force: true });
    }
  });

  it('returns 200 and the user when the id exists', () =>
    pact
      .addInteraction()
      .given('a user with ID 1 exists')
      .uponReceiving('a request for an existing user')
      .withRequest('GET', `/users/${existingUser.id}`, (builder) => {
        builder.headers({ Accept: 'application/json' });
      })
      .willRespondWith(200, (builder) => {
        builder.headers({ 'Content-Type': jsonContentType });
        builder.jsonBody({
          id: integer(existingUser.id),
          username: regex('^[a-zA-Z0-9_]{3,32}$', existingUser.username),
          email: email(existingUser.email)
        });
      })
      .executeTest(async (mockServer) => {
        const response = await getUser(mockServer.url, existingUser.id);
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual(existingUser);
      }));

  it('returns 404 problem+json when the user does not exist', () =>
    pact
      .addInteraction()
      .given(`no user with ID ${missingUserId} exists`)
      .uponReceiving('a request for a missing user')
      .withRequest('GET', `/users/${missingUserId}`, (builder) => {
        builder.headers({ Accept: 'application/json' });
      })
      .willRespondWith(404, (builder) => {
        builder.headers({ 'Content-Type': problemContentType });
        builder.jsonBody({
          type: like('http://localhost:3000/problems/404'),
          title: like('Not Found'),
          status: 404,
          detail: like('User not found'),
          instance: like(`/users/${missingUserId}`)
        });
      })
      .executeTest(async (mockServer) => {
        const response = await getUser(mockServer.url, missingUserId);
        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({
          type: 'http://localhost:3000/problems/404',
          title: 'Not Found',
          status: 404,
          detail: 'User not found',
          instance: `/users/${missingUserId}`
        });
      }));

  it('returns 400 problem+json when the id is not a positive integer', () =>
    pact
      .addInteraction()
      .uponReceiving('a request for a user with an invalid id')
      .withRequest('GET', '/users/abc', (builder) => {
        builder.headers({ Accept: 'application/json' });
      })
      .willRespondWith(400, (builder) => {
        builder.headers({ 'Content-Type': problemContentType });
        builder.jsonBody({
          type: like('http://localhost:3000/problems/400'),
          title: like('Bad Request'),
          status: 400,
          detail: like('The request is invalid'),
          instance: like('/users/abc'),
          errors: MatchersV3.eachLike({
            in: 'id',
            message: like('Value must be a integer within the interval [1, Infinity]')
          })
        });
      })
      .executeTest(async (mockServer) => {
        const response = await getUser(mockServer.url, 'abc');
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body).toMatchObject({
          type: 'http://localhost:3000/problems/400',
          title: 'Bad Request',
          status: 400,
          detail: 'The request is invalid',
          instance: '/users/abc'
        });
        expect(body.errors).toEqual([
          {
            in: 'id',
            message: 'Value must be a integer within the interval [1, Infinity]'
          }
        ]);
      }));

  if (!allowPactOverwrite) {
    it('matches the committed pact file without writing it', () => {
      const generated = JSON.parse(
        fs.readFileSync(path.join(pactWriteDir, pactFileName), 'utf8')
      ) as PactDoc;
      const committed = JSON.parse(fs.readFileSync(pactFile, 'utf8')) as PactDoc;
      expect(normalizePact(generated)).toEqual(normalizePact(committed));
    });
  }

  describe('provider verification', () => {
    let app: INestApplication;
    let providerBaseUrl: string;

    beforeAll(async () => {
      process.env.PG_DB_URL ??= 'postgres://postgres:postgres@localhost:5432/swgss-army-knife';
      process.env.REDIS_URL ??= 'redis://localhost:6379';
      app = await createApp({ logger: false });
      await app.listen(0, '127.0.0.1');
      providerBaseUrl = await app.getUrl();
    });

    afterAll(async () => {
      await app.close();
    });

    it('honours the GET /users/:id pact', async () => {
      await new Verifier({
        provider,
        providerBaseUrl,
        pactUrls: [pactFile],
        logLevel: 'error',
        stateHandlers: {
          'a user with ID 1 exists': async () => {},
          [`no user with ID ${missingUserId} exists`]: async () => {}
        }
      }).verifyProvider();
    });
  });
});
