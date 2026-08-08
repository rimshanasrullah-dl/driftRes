export function restrictTo(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      // Must return: otherwise the handler runs even after the 403 is sent.
      return res
        .status(403)
        .json({ error: "You do not have permission for this action" });
    }
    next();
  };
}
