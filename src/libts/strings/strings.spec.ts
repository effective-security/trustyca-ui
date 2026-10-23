import {
  capitalise,
  compareCaseInsensitive,
  createUUID,
  ellipsis,
  formatLocaleNumber,
  nextId,
  randomString,
  splitOnFirst,
  startsWith,
} from '.';

describe('strings functions', () => {
  it('capitalise()', () => {
    expect(capitalise(undefined as unknown as string)).toBe('');
    expect(capitalise('a')).toBe('a');
    expect(capitalise('aa')).toBe('Aa');
    expect(capitalise('aA')).toBe('Aa');
    expect(capitalise('aB')).toBe('Ab');
    expect(capitalise('aB aa')).toBe('Ab aa');
  });

  it('ellipsis() return original or truncated string', () => {
    const title = '123456789012345678901234567890';

    expect(ellipsis('')).toEqual('');
    expect(ellipsis(title, 3)).toEqual('...');
    expect(ellipsis(title, 6)).toEqual('123...');
    expect(ellipsis(title, 99)).toEqual(title);
  });

  it('splitOnFirst()', () => {
    const noInput = undefined as unknown as string;
    expect(splitOnFirst(noInput, noInput)).not.toBeNull();
    expect(splitOnFirst(noInput, noInput).length).toBe(0);
    expect(splitOnFirst('one', ' ').toString()).toBe(['one'].toString());
    expect(splitOnFirst('one two', ' ').toString()).toBe(['one', 'two'].toString());
  });

  it('startsWith()', () => {
    expect(startsWith('', 'A')).toBe(false);
    expect(startsWith('A', 'A')).toBe(true);
    expect(startsWith('A', '')).toBe(true);
    expect(startsWith('AB', 'B')).toBe(false);
    expect(startsWith('AB', 'B', 1)).toBe(true);
    expect(startsWith('ABCD', 'BCD', 1)).toBe(true);
    expect(startsWith('ABCD', 'BCD')).toBe(false);
    expect(startsWith('ABCD', 'ABCD')).toBe(true);
  });

  it('createUUID', () => {
    const uuid = createUUID();
    expect(typeof uuid).toEqual('string');
    expect(uuid.length).toEqual(36);

    const uuid2 = createUUID();
    expect(typeof uuid2).toEqual('string');
    expect(uuid2.length).toEqual(36);

    expect(uuid).not.toEqual(uuid2);
  });

  it('formatLocaleNumber()', () => {
    const formatter = new Intl.NumberFormat();
    expect(formatLocaleNumber(0)).toBe(formatter.format(0));
    expect(formatLocaleNumber(999)).toBe(formatter.format(999));
    expect(formatLocaleNumber(1000)).toBe(formatter.format(1000));
    expect(formatLocaleNumber(1533)).toBe(formatter.format(1533));
    expect(formatLocaleNumber(1000000)).toBe(formatter.format(1000000));
    expect(formatLocaleNumber('0')).toBe(formatter.format(0));
    expect(formatLocaleNumber('999')).toBe(formatter.format(999));
    expect(formatLocaleNumber('1000')).toBe(formatter.format(1000));
    expect(formatLocaleNumber('1533')).toBe(formatter.format(1533));
    expect(formatLocaleNumber('1000000')).toBe(formatter.format(1000000));
  });

  it('compareCaseInsensitive', () => {
    expect(compareCaseInsensitive('Aa', 'aA')).toBe(1);
    expect(compareCaseInsensitive('Aa', 'Aa')).toBe(0);
    expect(compareCaseInsensitive('Aa', 'bA')).toBe(-1);
    expect(compareCaseInsensitive('aAa', 'BbA')).toBe(-1);
    expect(compareCaseInsensitive('bA', 'Ab')).toBe(1);
    expect(compareCaseInsensitive('BbA', 'aAb')).toBe(1);
    expect(compareCaseInsensitive('01', 'a')).toBe(-1);
    expect(compareCaseInsensitive('1', '22')).toBe(-1);
  });

  it('randomString', () => {
    const str = randomString(10);
    expect(typeof str).toEqual('string');
    expect(str.length).toEqual(10);

    const str2 = randomString(12);
    expect(typeof str2).toEqual('string');
    expect(str2.length).toEqual(12);

    expect(str).not.toEqual(str2);
  });

  it('nextId', () => {
    const id = nextId();
    expect(typeof id).toEqual('number');
    expect(id).toBeGreaterThan(0);

    const id2 = nextId();
    expect(typeof id2).toEqual('number');
    expect(id2).toBeGreaterThan(0);

    expect(id).not.toEqual(id2);
  });
});
