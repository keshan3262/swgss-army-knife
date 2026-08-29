// TODO: Remove it when we have a real database
export const makeItemsPage = <T extends { id: number }>(allItems: T[], limit: number, startId: number) => {
  const itemsBeforeIndex = allItems.findIndex(item => item.id === startId) + 1;
  const items = allItems.slice(itemsBeforeIndex, itemsBeforeIndex + limit);
  const nextCursor = itemsBeforeIndex + limit < allItems.length - 1
    ? btoa(allItems[itemsBeforeIndex + limit - 1].id.toString())
    : null;

  return { items, next_cursor: nextCursor };
};
