const service = require('./user.service');

const getMe = async (req, res, next) => {
  try { res.json({ success: true, data: await service.getProfile(req.user.id) }); }
  catch (e) { next(e); }
};

const updateMe = async (req, res, next) => {
  try { res.json({ success: true, data: await service.updateProfile(req.user.id, req.body) }); }
  catch (e) { next(e); }
};

const submitVerification = async (req, res, next) => {
  try { res.json({ success: true, data: await service.submitVerification(req.user.id, req.body) }); }
  catch (e) { next(e); }
};

const reviewVerification = async (req, res, next) => {
  try { res.json({ success: true, data: await service.reviewVerification(req.params.id, req.body, req.user.id) }); }
  catch (e) { next(e); }
};

const getPendingVerifications = async (req, res, next) => {
  try { res.json({ success: true, data: await service.getPendingVerifications() }); }
  catch (e) { next(e); }
};

const changePassword = async (req, res, next) => {
  try {
    const result = await service.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
};

const listUsers = async (req, res, next) => {
  try { res.json({ success: true, ...(await service.listUsers(req.query)) }); }
  catch (e) { next(e); }
};

const deactivateUser = async (req, res, next) => {
  try { res.json({ success: true, ...(await service.deactivateUser(req.params.id)) }); }
  catch (e) { next(e); }
};

module.exports = { getMe, updateMe, submitVerification, reviewVerification, getPendingVerifications, changePassword, listUsers, deactivateUser };