import { UserInfo } from './UserInfo';

describe('UserInfo Basic', () => {
  test('UserInfoTest', () => {
    const ut = new UserInfo('Id', 'Name', 'name@email.com', true, { org1: 'Admin' });

    expect(ut.Email).toBe('name@email.com');
    expect(ut.Orgs).toEqual({ org1: 'Admin' });

    const ut2 = UserInfo.clone(ut);
    expect(ut2.Email).toBe('name@email.com');
  });
});
