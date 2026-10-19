import crypto from 'crypto'
import jwt from 'jsonwebtoken'

export function generateEmailToken() {
	return crypto.randomBytes(32).toString('hex')
}

export function generateJWT(payload) {
	return jwt.sign(payload, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRES_IN || '8h'
	})
}

export function verifyJWT(token) {
	return jwt.verify(token, process.env.JWT_SECRET)
}
