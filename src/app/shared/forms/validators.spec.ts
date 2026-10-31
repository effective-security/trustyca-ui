import { FormControl } from '@angular/forms';
import { goDuration, oid, parsePemBlocks, pem } from './validators';

const CERT = `-----BEGIN CERTIFICATE-----
MIIBszCCAVoCCQDq
-----END CERTIFICATE-----`;
const CSR = `-----BEGIN CERTIFICATE REQUEST-----
MIIBszCCAVoCCQDq
-----END CERTIFICATE REQUEST-----`;

describe('validators', () => {
  const run = (fn: ReturnType<typeof goDuration>, value: unknown) => fn(new FormControl(value));

  it('goDuration accepts Go durations and nothing else', () => {
    for (const ok of ['168h', '30m', '1h30m', '1.5h', '500ms', '-10s', ' 24h ', '', null]) {
      expect(run(goDuration(), ok)).toBeNull();
    }
    for (const bad of ['1d', '10', 'h', '1 h', '1hh']) {
      expect(run(goDuration(), bad)).toEqual({ goDuration: { value: bad } });
    }
  });

  it('oid accepts dotted identifiers', () => {
    for (const ok of ['1.2.840.113549.1.1.11', '2.5.29.17', '0.9', '']) {
      expect(run(oid(), ok)).toBeNull();
    }
    for (const bad of ['1', '3.1', '1.01', '1..2', 'a.b', '1.2.']) {
      expect(run(oid(), bad)).toEqual({ oid: { value: bad } });
    }
  });

  it('parsePemBlocks finds the blocks and their types', () => {
    expect(parsePemBlocks(`${CERT}\n${CSR}`)).toEqual([
      { type: 'CERTIFICATE', body: 'MIIBszCCAVoCCQDq' },
      { type: 'CERTIFICATE REQUEST', body: 'MIIBszCCAVoCCQDq' },
    ]);
    expect(parsePemBlocks('hello')).toEqual([]);
    expect(parsePemBlocks('-----BEGIN CERTIFICATE-----\nabc\n-----END PRIVATE KEY-----')).toEqual(
      [],
    );
  });

  it('pem checks the presence, the type and the count of the blocks', () => {
    expect(run(pem(), '')).toBeNull();
    expect(run(pem(), CERT)).toBeNull();
    expect(run(pem({ type: 'CERTIFICATE' }), CERT)).toBeNull();
    expect(run(pem({ type: 'CERTIFICATE', multiple: true }), `${CERT}\n${CERT}`)).toBeNull();

    expect(run(pem(), 'not pem')).toEqual({ pem: { reason: 'missing', expected: undefined } });
    expect(run(pem({ type: 'CERTIFICATE' }), CSR)).toEqual({
      pem: { reason: 'type', expected: 'CERTIFICATE' },
    });
    expect(run(pem(), `${CERT}\n${CERT}`)).toEqual({
      pem: { reason: 'multiple', expected: undefined },
    });
  });

  it('pem accepts a block type by its ending, for a private key of any flavour', () => {
    const key = pem({ typeSuffix: 'PRIVATE KEY' });
    const EC = '-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEIA\n-----END EC PRIVATE KEY-----';
    const PKCS8 = '-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMG\n-----END PRIVATE KEY-----';
    expect(run(key, EC)).toBeNull();
    expect(run(key, PKCS8)).toBeNull();
    expect(run(key, CERT)).toEqual({ pem: { reason: 'type', expected: 'PRIVATE KEY' } });
    expect(run(key, 'nope')).toEqual({ pem: { reason: 'missing', expected: 'PRIVATE KEY' } });
    expect(run(key, `${EC}\n${PKCS8}`)).toEqual({
      pem: { reason: 'multiple', expected: 'PRIVATE KEY' },
    });
  });
});
