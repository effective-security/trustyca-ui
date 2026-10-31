import { AuthorityType_Enum } from 'src/services/trustyca/protogen/pkix';
import { configToValues } from './issuer-config.model';
import {
  RegisterIssuerValues,
  buildRegisterIssuerRequest,
  hasSubject,
  keyLabel,
  parseLines,
  signingModes,
  subjectText,
  toX509Subject,
  validateRegistration,
} from './register-issuer.model';

const values = (over: Partial<RegisterIssuerValues> = {}): RegisterIssuerValues => ({
  projectId: '',
  label: 'issuing2',
  type: AuthorityType_Enum.Issuing,
  subject: {
    CommonName: 'Acme Issuing CA 2',
    Organisation: 'Acme',
    OrganisationalUnit: '',
    Country: 'US',
    State: '',
    Locality: '',
    SerialNumber: '',
  },
  san: '',
  keyAlgo: 'ECDSA',
  keySize: 256,
  keyProvider: '',
  signing: 'parent',
  parentId: 'i1',
  platformParentId: '',
  profile: 'tenant_ca',
  config: configToValues(undefined),
  ...over,
});

const emptySubject = {
  CommonName: '',
  Organisation: '',
  OrganisationalUnit: '',
  Country: '',
  State: '',
  Locality: '',
  SerialNumber: '',
};

describe('register issuer model', () => {
  it('offers self-signing to a Root and the signed modes to the others', () => {
    expect(signingModes(AuthorityType_Enum.Root)).toEqual(['self']);
    for (const t of [
      AuthorityType_Enum.Intermediate,
      AuthorityType_Enum.Issuing,
      AuthorityType_Enum.Shaken,
      AuthorityType_Enum.ShakenDelegated,
    ]) {
      expect(signingModes(t)).toEqual(['parent', 'platform', 'external']);
    }
  });

  it('requires a subject, a parent unless Root or external, and a CA profile with a signer', () => {
    expect(validateRegistration(values())).toEqual([]);
    expect(validateRegistration(values({ subject: emptySubject }))).toEqual([
      'The subject needs a common name or at least one name field.',
    ]);
    expect(hasSubject({ ...emptySubject, Organisation: 'Acme' })).toBe(true);
    expect(validateRegistration(values({ parentId: '' }))).toEqual(['Choose the parent issuer.']);
    expect(validateRegistration(values({ signing: 'platform' }))).toEqual([
      'Enter the ID of the platform issuer.',
    ]);
    expect(validateRegistration(values({ signing: 'external', profile: '' }))).toEqual([]);
    expect(validateRegistration(values({ profile: ' ' }))).toEqual([
      'The CA profile the signer uses is required.',
    ]);
    expect(
      validateRegistration(
        values({
          type: AuthorityType_Enum.Root,
          signing: 'self',
          parentId: '',
          profile: 'root_ca',
        }),
      ),
    ).toEqual([]);
    expect(validateRegistration(values({ type: AuthorityType_Enum.Root }))).toEqual([
      'A Root issuer is self-signed.',
    ]);
    expect(validateRegistration(values({ signing: 'self' }))).toEqual([
      'Choose how the issuer certificate is signed.',
    ]);
    expect(validateRegistration(values({ label: '  ', type: AuthorityType_Enum.Unknown }))).toEqual(
      ['A label is required.', 'Choose the type of the authority.'],
    );
    expect(validateRegistration(values({ keyAlgo: 'RSA', keySize: 256 }))).toEqual([
      'RSA does not accept a key of 256 bits.',
    ]);
  });

  it('builds the request of an issuer signed by a parent of the org', () => {
    const req = buildRegisterIssuerRequest(values({ san: 'ca.acme.test\n\n ocsp.acme.test , x' }));
    expect(req).toEqual({
      ProjectID: '',
      Label: 'issuing2',
      Type: AuthorityType_Enum.Issuing,
      Subject: {
        CommonName: 'Acme Issuing CA 2',
        SerialNumber: '',
        Names: [
          {
            Country: 'US',
            State: '',
            Locality: '',
            Organisation: 'Acme',
            OrganisationalUnit: '',
            SerialNumber: '',
          },
        ],
      },
      KeySpec: { Algo: 'ECDSA', Size: 256 },
      KeyProvider: '',
      ParentID: 'i1',
      Profile: 'tenant_ca',
      Config: expect.objectContaining({ AllowedProfiles: [] }),
      SAN: ['ca.acme.test', 'ocsp.acme.test', 'x'],
      Extensions: [],
    });
  });

  it('builds a self-signed Root without a parent, and a platform parent by its ID', () => {
    const root = buildRegisterIssuerRequest(
      values({
        type: AuthorityType_Enum.Root,
        signing: 'self',
        parentId: 'ignored',
        profile: 'root_ca',
        keyAlgo: 'RSA',
        keySize: 4096,
        keyProvider: ' softhsm ',
        subject: { ...emptySubject, CommonName: 'Acme Root' },
      }),
    );
    expect(root.ParentID).toBe('');
    expect(root.Profile).toBe('root_ca');
    expect(root.KeySpec).toEqual({ Algo: 'RSA', Size: 4096 });
    expect(root.KeyProvider).toBe('softhsm');
    expect(root.Subject?.Names).toEqual([]);

    const platform = buildRegisterIssuerRequest(
      values({ signing: 'platform', platformParentId: ' 1234 ', parentId: 'i1' }),
    );
    expect(platform.ParentID).toBe('1234');
    expect(platform.Profile).toBe('tenant_ca');
  });

  it('builds an external request without a parent and without a profile', () => {
    const req = buildRegisterIssuerRequest(values({ signing: 'external', profile: 'kept-out' }));
    expect(req.ParentID).toBe('');
    expect(req.Profile).toBe('');
    expect(req.Type).toBe(AuthorityType_Enum.Issuing);
  });

  it('renders the subject and the key for the review', () => {
    expect(subjectText(values().subject)).toBe('CN=Acme Issuing CA 2, O=Acme, C=US');
    expect(subjectText(emptySubject)).toBe('');
    expect(toX509Subject(emptySubject)).toEqual({ CommonName: '', SerialNumber: '', Names: [] });
    expect(keyLabel('ECDSA', 384)).toBe('ECDSA P-384');
    expect(keyLabel('RSA', 2048)).toBe('RSA 2048');
    expect(parseLines(' a \n\n b,c ')).toEqual(['a', 'b', 'c']);
  });
});
