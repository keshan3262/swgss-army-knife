import { getConversions } from "../utils/db-stub";
import { withAsyncException } from "../utils/with-async-exception";

export const listConversions = withAsyncException(async (req, res) => {
  const { limit, cursor } = req.query;
  const conversions = await getConversions(Number(limit), (cursor as string | undefined) ?? null);
  res.json(conversions);
});
