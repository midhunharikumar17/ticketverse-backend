const router = require('express').Router();
// Phase 10 — recommendation routes come here
router.get('/', (req, res) => res.json({ recommendations: [] }));
module.exports = router;
