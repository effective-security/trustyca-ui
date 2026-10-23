import { dateEndOfBusinessTomorrow } from 'src/libts';
import { Token } from './Token';

describe('Token Basic', () => {
  test('TokenTest', () => {
    const tk = new Token('Bearer', 'MockAccessToken', dateEndOfBusinessTomorrow(), new Date());

    expect(tk.hasExpired()).toBe(false);

    const tk2 = Token.clone(tk);
    expect(tk2.hasExpired()).toBe(false);
  });
});
