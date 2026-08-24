import { withAsyncException } from '../utils/with-async-exception';
import { getUsers } from '../utils/db-stub';

export const listUsers = withAsyncException(async (req, res) => {
  const { limit, cursor } = req.query;

  res.json(await getUsers(Number(limit), (cursor as string | undefined) ?? null));
});
