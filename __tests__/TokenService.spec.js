const sequelize = require('../src/config/database');
const Token = require('../src/auth/Token');
const tokenService = require('../src/auth/tokenService');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await Token.destroy({ truncate: true });
});

describe('Scheduled Token Cleanup', () => {
  it('clears the expired token with scheduled task', async () => {
    jest.useFakeTimers();
    const token = 'test-token';
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await Token.create({
      token,
      lastUsedAt: eightDaysAgo,
    });
    tokenService.scheduleCleanup();
    jest.advanceTimersByTime(60 * 60 * 1000 + 5000);
    const tokenInDB = await Token.findOne({ where: { token } });
    expect(tokenInDB).toBeNull();
  });
});
