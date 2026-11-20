const rate = Number(process.env.CHAOS_RATE ?? 0);

module.exports = (req, res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) && Math.random() < rate) {
    res.status(500).jsonp({ error: 'Учебный сбой сервера' });
    return;
  }
  next();
};
