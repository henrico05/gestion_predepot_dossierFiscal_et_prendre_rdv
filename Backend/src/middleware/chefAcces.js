// middlewares/requireChefService.js
export const requireChefService = (req, res, next) => {
	if (!req.user || req.user.role !== 'CHEF_CENTRE') {
		return res.status(403).json({
			message: 'Accès réservé au Chef de service'
		})
	}
	next()
}

// Accès à tout (super-admin)
export const requireChefOrRole = (...roles) => (req, res, next) => {
	if (!req.user) {
		return res.status(401).json({ message: 'Non authentifié' })
	}
	if (req.user.role === 'CHEF_CENTRE' || roles.includes(req.user.role)) {
		return next()
	}
	return res.status(403).json({ message: 'Accès refusé' })
}
