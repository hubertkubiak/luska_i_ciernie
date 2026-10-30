import { openAccounts } from '../auth/accounts';
import { ShelfStore, parseEntry } from './shelf-store';

async function setup() {
  const accounts = openAccounts(':memory:');
  const result = await accounts.register({ email: 'v@example.com', password: 'smoczy-ogien-123', displayName: 'Violet' });
  const userId = 'user' in result ? result.user.id : 0;
  return { accounts, shelf: new ShelfStore(accounts.db), userId };
}

describe('ShelfStore', () => {
  it('upserts one item per book and lists newest first', async () => {
    const { shelf, userId } = await setup();
    shelf.save(userId, 'fourth-wing', { status: 'tbr' });
    shelf.save(userId, 'iron-flame', { status: 'reading' });
    shelf.save(userId, 'fourth-wing', { status: 'read', rating: 5, note: '  Smoki!  ' });

    const items = shelf.list(userId);
    expect(items.map((i) => i.slug)).toEqual(['fourth-wing', 'iron-flame']);
    expect(items[0]).toMatchObject({ status: 'read', rating: 5, note: 'Smoki!' });
  });

  it('drops the rating when the book is no longer marked as read', async () => {
    const { shelf, userId } = await setup();
    shelf.save(userId, 'fourth-wing', { status: 'read', rating: 4 });
    expect(shelf.save(userId, 'fourth-wing', { status: 'reading', rating: 4 }).rating).toBeNull();
  });

  it('the database itself rejects invalid data (CHECK)', async () => {
    const { accounts, userId } = await setup();
    const insert = accounts.db.prepare('INSERT INTO shelf_items (user_id, book_slug, status, rating) VALUES (?, ?, ?, ?)');
    expect(() => insert.run(userId, 'a', 'zgubiona', null)).toThrow(/CHECK/);
    expect(() => insert.run(userId, 'b', 'read', 7)).toThrow(/CHECK/);
    expect(() => insert.run(userId, 'c', 'tbr', 3)).toThrow(/CHECK/); // a rating only for books already read
  });

  it("items belong to their owner and disappear with the account", async () => {
    const { accounts, shelf, userId } = await setup();
    shelf.save(userId, 'fourth-wing', { status: 'tbr' });
    expect(shelf.list(userId + 1)).toEqual([]);
    accounts.db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    expect(shelf.list(userId)).toEqual([]); // ON DELETE CASCADE
  });

  it('removes an item', async () => {
    const { shelf, userId } = await setup();
    shelf.save(userId, 'fourth-wing', { status: 'tbr' });
    expect(shelf.remove(userId, 'fourth-wing')).toBe(true);
    expect(shelf.remove(userId, 'fourth-wing')).toBe(false);
  });
});

describe('parseEntry', () => {
  it('accepts valid input', () => {
    expect(parseEntry({ status: 'read', rating: 5, note: 'x' })).toEqual({ status: 'read', rating: 5, note: 'x' });
    expect(parseEntry({ status: 'tbr' })).toEqual({ status: 'tbr', rating: null, note: null });
  });

  it('rejects anything else with a message', () => {
    for (const body of [null, {}, { status: 'lol' }, { status: 'read', rating: 6 }, { status: 'read', rating: 2.5 }, { status: 'tbr', note: 'x'.repeat(2001) }, { status: 'tbr', note: 42 }]) {
      expect(parseEntry(body)).toHaveProperty('error');
    }
  });
});
