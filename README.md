# swgss-army-knife

This is a prototype not of Marketplace API, but of API for compressing and converting images.

## Configuration

Configure these variables before running or testing. To configure non-exported environment variables, create and edit `.env` file (if going without Docker containers from `docker-compose.yml`) or `environment` section of `hw-13` container in `docker-compose.yml` (otherwise):

| Meaning  | Default value (if none, the variable is required) | Source |
| -------- | ------------------------------------------------- | ------ |
| The number of the port where the backend will listen | 3000 | Environment variable `PORT` |
| The base URL for backend | `http://localhost:<PORT>` | Environment variable `BASE_URL` |
| Connection string for Redis DB | | Environment variable `REDIS_URL` |
| 0/1 flag for using exported environment variables instead of store files to get connection string | 0 | Exported environment variable `SKIP_VAULT` |
| Connection string for the PostgreSQL database | If going with startup script `up.sh`, it will be generated for you automatically. If going to run `docker-compose` another way, it is `postgresql://admin:admin-bootstrap-only@localhost:20001` | `DB_URL` exported environment variable if `SKIP_VAULT=1`. `secrets/db-url` store file otherwise |

## Testing

### Database schemas

You can run database schemas with a large set of rows, not installing node modules or starting the backend. Do the following steps:
1. Start the container with PostgreSQL database using command `docker compose up -d postgres --wait --force-recreate`. It will start listening on port 20001, so if you have another process listening on it, kill it.
2. Set connection parameters in environment variables: `export PGUSER=admin PGHOST=localhost PGPORT=20001 PGDATABASE=swgss-army-knife PGPASSWORD=admin-bootstrap-only`. The password is already in `docker-compose.yml`, so there is no secrets leak. Without setting them, you have to add a connection string `postgresql://admin:admin-bootstrap-only@localhost:20001/swgss-army-knife` for each `psql` command before other parameters.
3. Check the connection to the database: `psql`. You should see psql shell.
4. Exit the shell with `\q` command and setup schemas with command `psql -f db/schema.sql`.
5. Fill all tables: `psql -f db/seed.sql`. The main table is `conversions`, so check the filling with command `psql -Atc "SELECT count(*) FROM conversions"`.
6. Check the tables performance before adding indexes: `psql -c "EXPLAIN (ANALYZE, BUFFERS) $(cat db/queries/q1.sql)"`, `psql -c "EXPLAIN (ANALYZE, BUFFERS) $(cat db/queries/q2.sql)"`, `psql -c "EXPLAIN (ANALYZE, BUFFERS) $(cat db/queries/q3.sql)"`. The output should be like in `db/OPTIMIZATIONS.md`.
7. Set up indexes: `psql -f db/indexes.sql`, `psql -c "ANALYZE;"`.
8. Check the tables performance again with commands from point 7. The output should be like in `db/OPTIMIZATIONS.md`. There should be no more `Seq Scan` entries.

### Linting

Install node modules using `npm install`. After that, you will be able to run the tests below.
- Specs validation: `npx @redocly/cli lint openapi/openapi.yaml`.
- Specs volume validation:
  ```shell
  npx @redocly/cli bundle openapi/openapi.yaml -o spec.json
  node -e "const s=require('./spec.json'),M=['get','post','put','patch','delete'];\
  const ops=Object.entries(s.paths).flatMap(([p,v])=>Object.keys(v).filter(m=>M.includes(m)).map(m=>[p,m]));\
  const idem=ops.flatMap(([p,m])=>s.paths[p][m].parameters??[]).find(x=>x.in==='header'&&/idempotency-key/i.test(x.name));\
  console.log('операцій:',ops.length,'· ресурсів:',new Set(Object.keys(s.paths).map(p=>p.split('/')[1])).size);\
  console.log('Idempotency-Key: required =',idem?.required,'· опис, символів =',(idem?.description??'').trim().length)"
  ```
- Checking that `.env.example` file is synchronized with environment variables validation schema: `npm run check:env`.

### Requests tests

Before running them, install node modules with `npm install`, build the server, and start it. There are two options:
- Without Docker containers. Do the following steps:
  1. Start Redis and PostgreSQL DBs unless they have been started yet.
  2. Make sure that the configuration is proper.
  3. Build the backend with `npm run build` command.
  4. Start the backend with `npm run start` command.
- With Docker containers. Just run `./up.sh`. Before starting the backend, Docker containers for DBs will be set up. Don't use it if there is a local Redis server listening on port 20000 or PostgreSQL server listening on port 20001.
After you see `Server is running on port <PORT>` (in a terminal or a container console), you will be able to do the tests below.

- Automated pact-based checks: run `./node_modules/.bin/cross-env DB_URL=<DB_URL> REDIS_URL=<REDIS_URL> PORT=<PORT> npm run test`. `PORT` must be an arbitrary unoccupied port. The default values for env variables are given below, you may remove a variable in the command above if the default value is OK.
  - `PORT`: 3000
  - `DB_URL`: `postgresql://app_user@localhost:5432/swgss-army-knife`
  - `REDIS_URL`: `redis://localhost:6379`
- List pagination check:
  1. Make the first request for users:
    ```shell
    curl -H "Content-Type: application/json" http://localhost:3000/users
    ```
  2. Check the transition between pages:
    ```shell
    curl -H "Content-Type: application/json" 'http://localhost:3000/users?cursor=MTA%3D'
    ```
    `MTA%3D` is URI encoded value of the previous cursor. The last user from the previous request has id 10, and the first one from this one has id 11, so pages do not overlap or skip records.
  3. Check the last page with another page size:
    ```shell
    curl -H "Content-Type: application/json" 'http://localhost:3000/users?cursor=MjY2&limit=20'
    ```
    See a user with the last ID 286 and `next_cursor` having value `null`.
- Empty body validation:
  ```shell
  curl -H "Content-Type: application/json" -H "Idempotency-Key: foo1" -v http://localhost:3000/users -d "{}"
  ```
  Expected response body (prettified):
  ```json
  {
    "type": "http://localhost:3000/problems/validation-failed",
    "title": "Bad Request",
    "status": 400,
    "detail": "The request is invalid",
    "instance": "/users",
    "errors": [
      {
        "field": "username",
        "rules": [
          "username must match ^[a-zA-Z0-9_]+$ regular expression","username must be shorter than or equal to 32 characters","username must be longer than or equal to 3 characters","username must be a string"
        ]
      },
      {
        "field": "email",
        "rules": [
          "email must be shorter than or equal to 254 characters",
          "email must be an email"
        ]
      }
    ]
  }
  ```
  There also should be `HTTP/1.1 400 Bad Request` line in the output.
- Validation of POST request without `Idempotency-Key` header:
  ```shell
  curl -H "Content-Type: application/json" -v http://localhost:3000/users -d '{"username":"arthurweasley","email":"aweasley@gmail.com"}'
  ```
  Expected response body (prettified):
  ```json
  {
    "type": "http://localhost:3000/problems/400",
    "title": "Bad Request",
    "status": 400,
    "detail": "The request is invalid",
    "instance": "/users",
    "errors": [{"field":"idempotency-key","rules":["Idempotency-Key header is required"]}]
  }
  ```
  `HTTP/1.1 400 Bad Request` line in the output for this command too.
- Green flow for adding a user:
  ```shell
  curl -H "Content-Type: application/json" -H "Idempotency-Key: foo1" -v http://localhost:3000/users -d '{"username":"arthurweasley","email":"aweasley@gmail.com"}'
  ```
  Expected response body:
  ```json
  {"id":287,"username":"arthurweasley","email":"aweasley@gmail.com"}
  ```
- POST idempotency checks:
  * Repeat the "Green flow" command, and you will see response with the same body but with `Idempotency-Replay: true` header.
  * Getting the error of using the same idempotency key with another body:
    ```shell
    curl -H "Content-Type: application/json" -H "Idempotency-Key: foo1" -v http://localhost:3000/users -d '{"username":"arthurweasley","email":"a.weasley@gmail.com"}'
    ```
    Expect the response with 422 error code.
  * Change the idempotency key to do the successful operation, for example:
    ```shell
    curl -H "Content-Type: application/json" -H "Idempotency-Key: foo2" -v http://localhost:3000/users -d '{"username":"arthurweasley","email":"a.weasley@gmail.com"}'
    ```

## Grading

## Architectural decisions record

### What is it

This is a service that joins various tools for compressing and converting images, which is designed to help minify bundles for websites and mobile applications. Some examples are below:

1. A user has to add outline of Ukraine to a website, specified by a [heavy SVG of Ukraine borders (117 KB)](https://commons.wikimedia.org/wiki/File:Outline_of_Ukraine.svg). They upload it to the backend, choosing PNG output type, and get a lighter version of the same size (~49 KB). This reduces consuming web traffic.
2. A user had to add a set of SVG icons to a website. They upload them to the backend, choosing SVG output type, and get the same icons reduced by size. This is another way of reducing the consumed web traffic.
3. A user has to add a couple of images to a mobile application, specified in WEBP format. A user can try to minimize the bundle size by converting these images to PNG or JPEG (depending on content), but doing without WEBP codec.

### Domain

| Match | Requirement | Comments |
| -------- | -------- | -------- |
| ✅ | At least two users roles with different rights | Admins will be able to view conversions for all users with various sorting, but other users will be able to view only their own conversions |
| ✅ | Limited resources | Images operations are computationally intensive, so the service will be able to convert limited amount of images per time |
| ✅ | Irrevertable operations | Images conversions will not be aborted |
| ✅ | Events that need notifications | Microservices and lambdas for conversions will have to notify when they finish a job |
| ✅ | Entities with files | Conversions cannot do without storing or processing images |
| ✅ | Data that is frequently read but rarely updated | Users are not likely to change their data, and conversions can only be removed from history after they complete or fail |
| ❌ | 4 - 6 entities with connections and at least one "heavy" request | For relational databases, there are at most 3: user, conversion, and image input - output pair. However, a conversion belongs to a user and a pair belongs to a conversion.

### Architectural decisions

- Compute model: the service will consist of the following parts:
  * API service: manages conversions state and user access.
  * AWS Lambdas for conversions that should be executed with `sharp` or `svgo`, one lambda for each library.
  * Microservices for conversions that should be executed with `oxipng` or `resvg`.
  This split provides scalability and enables partial service work even if one of lambdas or microservices freezes.
- Database: both Redis and PostgreSQL will be used. PostgreSQL is a "golden standard" for storing related entities, but Redis will provide higher speeds for caches and idempotency checks.
- Asynchronity: images conversions may complete at any time, and it may start late when the service is highly loaded, so a producer should know whether the client application consumed the message. RabbitMQ provides this property.
- Auth: OAuth2 should work well because this is a convenient authorization method that also enables access to email address.
- Deployment: Github Actions provide sufficiently quick deployments, AWS instead of, for example, Digital Ocean, will enable using lambdas.

### Trade-offs

1. Not going to implement conversion from raster images to SVG, even if an input image is "obviously" a drawing. Embedding the image into SVG makes no sense, but true vectorizing requires to develop a solution based on neural networks, which requires plenty of efforts and will be expensive to maintain.
2. Not going to implement Node.js bindings for modern versions of `oxipng` and `resvg`, although it enables switching to AWS Lambdas. It either requires a separate research or a permission to use AI.

### Updates

1. It is better to have four entities in the DB: user, conversion, input image, and output image, then the coherence will be easier to maintain.
