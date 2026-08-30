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
