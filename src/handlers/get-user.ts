import { getUserById } from "../utils/db-stub";
import { NotFoundException } from "../utils/errors";
import { withAsyncException } from "../utils/with-async-exception";

export const getUser = withAsyncException(async (req, res) => {
  const { id } = req.params;

  const user = await getUserById(Number(id));

  if (user) {
    res.json(user);
  } else {
    throw new NotFoundException('User not found');
  }
});
