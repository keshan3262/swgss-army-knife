import { withAsyncException } from '../utils/with-async-exception';
import { createUser as createUserDb } from '../utils/db-stub';

export const createUser = withAsyncException(async (req, res) => {
  const user = await createUserDb({
    username: req.body.username,
    email: req.body.email
  });

  res.status(201).json(user);
});
