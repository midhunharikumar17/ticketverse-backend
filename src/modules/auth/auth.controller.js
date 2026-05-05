const authService = require('./auth.service');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge:   30 * 24 * 60 * 60 * 1000, // 30 days
};

async function register(req, res, next) {
  try {
    const { user, accessToken, rawRefresh } = await authService.register(req.body);
    res.cookie('refreshToken', rawRefresh, COOKIE_OPTIONS);
    res.status(201).json({ user, token: accessToken });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { user, accessToken, rawRefresh } = await authService.login(req.body);
    res.cookie('refreshToken', rawRefresh, COOKIE_OPTIONS);
    res.json({ user, token: accessToken });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken;
    const { accessToken, rawRefresh } = await authService.refresh(rawToken);
    res.cookie('refreshToken', rawRefresh, COOKIE_OPTIONS);
    res.json({ token: accessToken });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken;
    await authService.logout(rawToken);
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout };