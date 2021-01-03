module.exports = (req, res, next) => {
  const pageAsNumber = Number.parseInt(req.query.page);
  const sizeAsNumber = Number.parseInt(req.query.size);
  let page = Number.isNaN(pageAsNumber) ? 0 : pageAsNumber;
  let size = Number.isNaN(sizeAsNumber) ? 10 : sizeAsNumber;
  if (page < 0) {
    page = 0;
  }
  if (size > 10 || size < 1) {
    size = 10;
  }
  req.pagination = { size, page };
  next();
};
