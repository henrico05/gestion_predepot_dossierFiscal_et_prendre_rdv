// middleware/Auth.js
import jwt from 'jsonwebtoken'

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization
  
  // 1. Vérifier la présence du header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Token manquant ou format invalide',
      authError: true
    })
  }
  
  const token = authHeader.split(' ')[1]
  
  try {
    // 2. Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // 3. On attache les infos de l'utilisateur à la requête
    req.user = decoded   // { id, role, email, ... }
    
    next()
  } catch (error) {
    // Différencier expiration et token invalide (optionnel mais propre)
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expiré, veuillez vous reconnecter',
        authError: true
      })
    }
    
    return res.status(401).json({
      message: 'Token invalide',
      authError: true
    })
  }
}

export const authAgent = (req, res, next) => {
  auth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Non authentifié'
      })
    }
    
    const rolesAgent = [
      'VERIFICATEUR',
       'GUICHETIER',
       'CHEF_CENTRE'
    ]
    
    if (!rolesAgent.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Accès réservé aux agents.'
      })
    }
    
    next()
  })
}


export const authContribuable = (req, res, next) => {
  auth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Non authentifié'
      })
    }
    
    if (req.user.role !== 'CONTRIBUABLE') {
      return res.status(403).json({
        message: 'Accès réservé aux contribuables.'
      })
    }
    
    next()
  })
}

export const authGuichetierOuChef = (req, res, next) => {
  auth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Non authentifié'
      })
    }
    
    if (!['GUICHETIER', 'CHEF_CENTRE'].includes(req.user.role)) {
      return res.status(403).json({
        message: 'Accès réservé aux guichetiers ou au Chef de centre.'
      })
    }
    
    next()
  })
}

export const authVerificateurOuChef = (req, res, next) => {
  auth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Non authentifié'
      })
    }
    
    if (!['VERIFICATEUR', 'CHEF_CENTRE'].includes(req.user.role)) {
      return res.status(403).json({
        message: 'Accès réservé aux vérificateurs ou au Chef de centre.'
      })
    }
    
    next()
  })
}

export const authChef = (req, res, next) => {
  auth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Non authentifié'
      })
    }
    
    if (req.user.role !== 'CHEF_CENTRE') {
      return res.status(403).json({
        message: 'Accès réservé au Chef de centre.'
      })
    }
    
    next()
  })
}

// Helper pour vérifier un token manuellement (ex: socket.io)
export const verifyJWT = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return null
  }
}

export default auth
