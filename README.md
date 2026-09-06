# nodejs-pro
One-stage build container has a size of 314 MB because of installed development dependencies and source code, while the multi-stage build container has a size of 254 MB.

To build the backend container, run `docker build -f Dockerfile -t hw-05 .`. Then run it with command `docker run -d --name hw-05 -p 3000:3000 hw-05`.

You can start both backend and Postgres DB in 'production' mode with command `docker compose -f docker-compose.yml up -d --wait` or in development mode with hot reload using `docker compose up -d --wait`.
To check that Postgres data is persisted, do the following steps when all containers are up:
1. Run `docker compose exec postgres psql -U admin -d swgss-army-knife -c "CREATE TABLE IF NOT EXISTS test(id int); INSERT INTO test VALUES (1);"`. You should see output like below:
  ```
  CREATE TABLE
  INSERT 0 1
  ```
2. Remove all containers with the command `docker compose down`.
3. Run all containers again using `docker compose up -d --wait`.
4. Count all rows from the `test` table with command `docker compose exec postgres psql -U admin -d swgss-army-knife -c "SELECT count(*) from test;"`. You should see output like this, make sure that there is at least one row (you may have more if you have inserted some rows before):
  ```
   count
  -------
       1
  (1 row)
  ```

## Testing

You can run database schemas without installing node modules or starting the backend. Do the following steps:
1. Go to bash shell using `/bin/bash` command if you are not there yet. You can check the current shell using command `ps -p $$`.
2. Start the container with PostgreSQL database using command `docker compose up -d postgres --wait`. It will start listening on port 20001, so if you have another process listening on it, kill it.
3. Set connection parameters in environment variables: `export PGUSER=admin PGHOST=localhost PGPORT=20001 PGDATABASE=swgss-army-knife PGPASSWORD=admin-bootstrap-only`. The password is already in `docker-compose.yml`, so there is no secrets leak.
4. Check the connection to the database: `psql`. You should see psql shell.
5. Exit the shell with `\q` command and setup schemas with command `psql -f db/schema.sql`.
6. Fill all tables: `psql -f db/seed.sql`. The main table is `conversions`, so check the filling with command `psql -Atc "SELECT count(*) FROM conversions"`.
7. Check the tables performance before adding indexes: `psql -c "EXPLAIN (ANALYZE, BUFFERS) $(cat db/queries/q1.sql)"`, `psql -c "EXPLAIN (ANALYZE, BUFFERS) $(cat db/queries/q2.sql)"`, `psql -c "EXPLAIN (ANALYZE, BUFFERS) $(cat db/queries/q3.sql)"`. The output should be like in `db/OPTIMIZATIONS.md`.
8. Set up indexes: `psql -f db/indexes.sql`, `psql -c "ANALYZE;"`.
9. Check the tables performance again with commands from point 7. The output should be like in `db/OPTIMIZATIONS.md`. There is still a `Seq Scan` for `users` table but it is caused by a small number of users. It is hard to make up enough first names and last names to guarantee large enough set of users.
