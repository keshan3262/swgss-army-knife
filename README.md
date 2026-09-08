# swgss-army-knife

This is a prototype not of Marketplace API, but of API for compressing and converting images.

## Testing

Install node modules using `npm install` or `yarn`. After that, you will be able to run the linting tests below.
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
- Checking that `.env.example` file is synchronized with environment variables validation schema: `npm run check:env` or `yarn run check:env`.

Before starting the local version of backend (without Docker containers), set up these environment variables in `.env`:
- `PORT`: the number of the port where the backend will listen.
- `BASE_URL`: the base URL for backend, default is `http://localhost:<PORT>`.
- `PG_DB_HOST`: the hostname of PostgreSQL database.
- `PG_DB_PORT`: the port number for PostgreSQL database.
- `REDIS_URL`: the complete URL for Redis DB.
Also set the password for PostgreSQL database in `secrets/db_password` if you are going to start the backend without Docker containers.

Before running requests tests, build and start the server. There are two options:
- Without Docker containers. Do the following steps:
  1. Start Redis and PostgreSQL DBs unless they have been started yet.
  2. Create `app_user` user in PostgreSQL DB with a password if it is not there yet, using PostgreSQL command `CREATE ROLE app_user WITH LOGIN PASSWORD '<YOUR_PASSWORD>';`.
  3. Set password for this user if this user has been before, but without a password, using PostgreSQL command `ALTER ROLE app_user WITH PASSWORD '<YOUR_PASSWORD>';`
  4. Create `secrets/db_password` file with the password for this user.
  5. Build the backend with `npm run build` or `yarn run build` command.
  6. Start the backend with `npm run start` or `yarn run start` command.
- With Docker containers. Just run `./up.sh`. Before starting the backend, Docker containers for DBs will be set up. Don't use it if there is a local Redis server listening on port 20000 or PostgreSQL server listening on port 20001.
After you see `Server is running on port <PORT>` (in a terminal or a container console), you will be able to do the tests below.

- Healthcheck and password rotation:
  1. Check backend health and uptime:
     ```shell
     curl -H "Content-Type: application/json" http://localhost:3000/health
     ```
  2. Run `./rotate.sh` to rotate the password.
  3. Check backend health and uptime again (see step 1). The uptime should not decrease.
- Automated pact-based checks: run `./node_modules/.bin/cross-env PG_DB_HOST=<PG_DB_HOST> PG_DB_PORT=<PG_DB_PORT> REDIS_URL=<REDIS_URL> PORT=<PORT> yarn run test`. `PORT` must be an arbitrary unoccupied port. The default values for env variables are given below, you may remove a variable in the command above if the default value is OK.
  - `PORT`: 3000
  - `PG_DB_HOST`: `localhost`
  - `PG_DB_PORT`: 5432
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
