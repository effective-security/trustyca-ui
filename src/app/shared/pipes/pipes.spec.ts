import { Role_Enum } from 'src/services/trustyca/protogen/orgs';
import { IssuerStatus_Enum } from 'src/services/trustyca/protogen/pkix';
import { ItemStatus_Enum, Scope_Enum } from 'src/services/trustyca/protogen/types';
import { ExpiresInPipe, RelativeTimePipe, Rfc3339DatePipe } from './date.pipes';
import { EnumNamePipe } from './enum-name.pipe';
import { FingerprintPipe } from './fingerprint.pipe';
import { expiryState, parseTime } from './time';

describe('pipes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-31T12:00:00Z'));
  });

  afterEach(() => vi.useRealTimers());

  it('parseTime reads RFC 3339 and treats the zero time as unset', () => {
    expect(parseTime('2026-10-31T11:25:07Z')?.toISOString()).toBe('2026-10-31T11:25:07.000Z');
    expect(parseTime('0001-01-01T00:00:00Z')).toBeUndefined();
    expect(parseTime('')).toBeUndefined();
    expect(parseTime(undefined)).toBeUndefined();
    expect(parseTime('not a date')).toBeUndefined();
  });

  it('rfc3339Date formats in local time and leaves an unset value empty', () => {
    const pipe = new Rfc3339DatePipe();
    const local = new Date('2026-10-31T11:25:07Z');
    expect(pipe.transform('2026-10-31T11:25:07Z')).toContain(String(local.getFullYear()));
    expect(pipe.transform('2026-10-31T11:25:07Z', 'date')).toMatch(
      /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/,
    );
    expect(pipe.transform('2026-10-31T11:25:07Z', 'long')).toMatch(/:\d{2}:\d{2}/);
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform('0001-01-01T00:00:00Z')).toBe('');
  });

  it('relativeTime and expiresIn speak about the present', () => {
    expect(new RelativeTimePipe().transform('2026-10-31T09:00:00Z')).toBe('3 hours ago');
    expect(new RelativeTimePipe().transform('2026-11-03T12:00:00Z')).toBe('in 3 days');
    expect(new RelativeTimePipe().transform('')).toBe('');

    const expires = new ExpiresInPipe();
    expect(expires.transform('2026-11-12T12:00:00Z')).toBe('expires in 12 days');
    expect(expires.transform('2026-10-28T12:00:00Z')).toBe('expired 3 days ago');
    expect(expires.transform(undefined)).toBe('');

    expect(expiryState('2026-11-12T12:00:00Z')).toBe('soon');
    expect(expiryState('2027-11-12T12:00:00Z')).toBe('ok');
    expect(expiryState('2026-10-28T12:00:00Z')).toBe('expired');
    expect(expiryState('')).toBe('none');
  });

  it('fingerprint groups hex pairs', () => {
    const pipe = new FingerprintPipe();
    expect(pipe.transform('ab12cd3')).toBe('AB:12:CD:3');
    expect(pipe.transform('AB:12:CD', ' ')).toBe('AB 12 CD');
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('enumName uses the generated display names', () => {
    const pipe = new EnumNamePipe();
    expect(pipe.transform(Role_Enum.Owner, 'Role')).toBe('Owner');
    expect(pipe.transform('Admin', 'Role')).toBe('Admin');
    expect(pipe.transform('APIKey', 'Role')).toBe('API Key');
    expect(pipe.transform('8', 'Role')).toBe('Owner');
    expect(pipe.transform('None', 'Role')).toBe('None');
    expect(pipe.transform('Janitor', 'Role')).toBe('Janitor');
    expect(pipe.transform('', 'Role')).toBe('');
    expect(pipe.transform(IssuerStatus_Enum.Pending, 'IssuerStatus')).toBe('Pending');
    expect(pipe.transform(ItemStatus_Enum.Active, 'ItemStatus')).toBe('Active');
    expect(pipe.transform(Scope_Enum.Org, 'Scope')).toBe('Organization');
    expect(pipe.transform(Scope_Enum.Project, 'Scope')).toBe('Project');
    expect(pipe.transform(undefined, 'Role')).toBe('');
  });
});
