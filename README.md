# swgss-army-knife

This is a prototype not of Marketplace API, but of API for compressing and converting images. Contract part is implemented according to the option B (Express server with `express-openapi-validator`).

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

Before running requests tests, start the development version of the server. There are two options:
- `npm start` or `yarn start`: if there is a local Redis server listening on port 6379, the backend will use it to store idempotency keys; otherwise, it will fall back to in-memory storage. Use it if you already have such local Redis server.
- `docker-compose up -d`: before starting the backend, a Docker container with Redis 8.10.1 will be set up. Don't use it if there is a local Redis server listening on port 6379.
After you see `Server is running on port 3000`, you will be able to do the tests below.

- List pagination check:
  * Make the first request for conversions:
    ```shell
    curl -H "Content-Type: application/json" http://localhost:3000/users
    ```
  * Check the transition between pages:
    ```shell
    curl -H "Content-Type: application/json" 'http://localhost:3000/users?cursor=MTA%3D'
    ```
    `MTA%3D` is URI encoded value of the previous cursor. The last user from the previous request has id 10, and the first one from this one has id 11, so pages do not overlap or skip records.
  * Check the last page with another page size:
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
    "type": "http://localhost:3000/problems/400",
    "title": "Bad Request",
    "status": 400,
    "detail": "request/body must have required property 'username'",
    "instance": "http://localhost:3000/users",
    "errors": [
      {
        "path": "/body/username",
        "message": "must have required property 'username'",
        "errorCode": "required.openapi.validation"
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
    "detail": "request/headers must have required property 'idempotency-key'",
    "instance": "http://localhost:3000/users",
    "errors": [
      {
        "path": "/headers/idempotency-key",
        "message": "must have required property 'idempotency-key'",
        "errorCode": "required.openapi.validation"
      }
    ]
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
