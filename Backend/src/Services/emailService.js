import 'dotenv/config'
import nodemailer from 'nodemailer'

const CONTRIBUABLE_FRONTEND_URL =
process.env.CONTRIBUABLE_FRONTEND_URL ||
'http://localhost:5173'

const AGENT_FRONTEND_URL =
process.env.AGENT_FRONTEND_URL ||
'http://localhost:5174'

// ======================================================
// CONFIGURATION SMTP MAILTRAP
// ======================================================

const transporter = nodemailer.createTransport({
	host: process.env.EMAIL_HOST,
	port: Number(process.env.EMAIL_PORT),
											   secure: false,
											   
											   auth: {
												   user: process.env.EMAIL_USER,
											   pass: process.env.EMAIL_PASS
											   }
})


// ======================================================
// VÉRIFICATION CONNEXION MAIL
// ======================================================

export async function verifyMailConnection() {
	try {
		
		await transporter.verify()
		
		console.log('✅ Mailtrap SMTP connecté')
		
	} catch (error) {
		
		console.error(
			'❌ Mailtrap SMTP erreur :',
			error.message
		)
		
	}
}

export async function checkMailConnection() {
	try {
		await transporter.verify()
		return true
	} catch (error) {
		console.error('❌ Connexion SMTP impossible :', error.message)
		return false
	}
}


// ======================================================
// EMAIL DE VÉRIFICATION
// ======================================================

export async function sendVerificationEmail({
	to,
	nom,
	prenom,
	token,
	accountType
}) {
	
	// Vérification du type
	const normalizedType =
	accountType?.toUpperCase()
	
	if (
		normalizedType !== 'AGENT' &&
		normalizedType !== 'CONTRIBUABLE'
	) {
		throw new Error(
			`Type de compte invalide : ${accountType}`
		)
	}
	
	// ====================================================
	// URL DE VÉRIFICATION
	// ====================================================
	
	let frontendUrl
	
	if (normalizedType === 'AGENT') {
		frontendUrl = AGENT_FRONTEND_URL
	} else {
		frontendUrl = CONTRIBUABLE_FRONTEND_URL
	}
	
	const verifyUrl =
	`${frontendUrl}/verify-email` +
	`?token=${encodeURIComponent(token)}` +
	`&type=${normalizedType.toLowerCase()}`
	
	// ====================================================
	// TEXTES
	// ====================================================
	
	const accountLabel =
	normalizedType === 'AGENT'
	? 'Agent'
	: 'Contribuable'
	
	const subject =
	normalizedType === 'AGENT'
	? 'Confirmez votre compte Agent — IMPOTS Manakara'
	: 'Confirmez votre compte Contribuable — IMPOTS Manakara'
	
	const html = `
	<div style="
	font-family: Arial, sans-serif;
	max-width: 600px;
	margin: 0 auto;
	">
	
	<h2 style="color: #1e3a5f;">
	IMPOTS Manakara — Validation de compte
	</h2>
	
	<p>
	Bonjour <strong>${prenom} ${nom}</strong>,
	</p>
	
	<p>
	Merci de vous être inscrit sur le portail
	<strong>${accountLabel}</strong>.
	</p>
	
	<p>
	Veuillez cliquer sur le bouton ci-dessous
	pour confirmer votre adresse email :
	</p>
	
	<p style="
	text-align: center;
	margin: 30px 0;
	">
	
	<a
	href="${verifyUrl}"
	style="
	background: #3b82f6;
	color: white;
	padding: 12px 24px;
	text-decoration: none;
	border-radius: 8px;
	font-weight: bold;
	"
	>
	Confirmer mon email
	</a>
	
	</p>
	
	<p style="
	color: #64748b;
	font-size: 13px;
	">
	
	Ce lien expire dans 24 heures.<br>
	
	Après validation de votre email,
	votre compte sera examiné par un administrateur.
	
	</p>
	
	<hr>
	
	<p style="
	font-size: 12px;
	color: #94a3b8;
	">
	
	Direction Régionale des Impôts — Manakara
	
	</p>
	
	</div>
	`
	
	await transporter.sendMail({
		from: process.env.EMAIL_FROM,
		to,
		subject,
		html
	})
}

// ======================================================
// EMAIL RAPPEL RENDEZ-VOUS
// ======================================================

export async function sendRdvRappel({
	to,
	nom,
	date,
	heure,
	service,
	type
}) {
	
	if (!to) {
		throw new Error(
			'Adresse email du contribuable manquante'
		)
	}
	
	const titre =
	type === 'J1'
	? 'Rappel de votre rendez-vous — demain'
	: 'Rappel de votre rendez-vous — dans 2 heures'
	
	const message =
	type === 'J1'
	? 'Votre rendez-vous fiscal est prévu demain.'
	: 'Votre rendez-vous fiscal est prévu dans environ 2 heures.'
	
	const subject =
	`Rappel rendez-vous fiscal — ${date} à ${heure}`
	
	const html = `
	<div style="
	font-family: Arial, sans-serif;
	max-width: 600px;
	margin: 0 auto;
	background: #ffffff;
	padding: 20px;
	color: #1e293b;
	">
	
	<div style="
	background: #0b2a5b;
	color: white;
	padding: 22px;
	text-align: center;
	border-radius: 10px 10px 0 0;
	">
	
	<h2 style="
	margin: 0;
	font-size: 22px;
	">
	IMPOTS Manakara
	</h2>
	
	<p style="
	margin: 8px 0 0;
	font-size: 14px;
	">
	Portail Contribuable
	</p>
	
	</div>
	
	
	<div style="
	border: 1px solid #e2e8f0;
	border-top: none;
	padding: 30px;
	border-radius: 0 0 10px 10px;
	">
	
	<h2 style="
	color: #1e3a5f;
	margin-top: 0;
	">
	${titre}
	</h2>
	
	
	<p>
	Bonjour
	<strong>${nom || 'Contribuable'}</strong>,
	</p>
	
	
	<p>
	${message}
	</p>
	
	
	<div style="
	background: #f1f5f9;
	border-radius: 10px;
	padding: 20px;
	margin: 25px 0;
	">
	
	<h3 style="
	margin-top: 0;
	color: #1e3a5f;
	">
	Détails du rendez-vous
	</h3>
	
	
	<p style="margin: 8px 0;">
	<strong>Service :</strong>
	${service || 'Service fiscal'}
	</p>
	
	
	<p style="margin: 8px 0;">
	<strong>Date :</strong>
	${date}
	</p>
	
	
	<p style="margin: 8px 0;">
	<strong>Heure :</strong>
	${heure}
	</p>
	
	</div>
	
	
	<p>
	Nous vous invitons à vous présenter
	à l'heure prévue.
	</p>
	
	
	<p style="
	color: #64748b;
	font-size: 13px;
	">
	En cas d'empêchement, veuillez consulter
	votre espace contribuable afin de gérer
	votre rendez-vous.
	</p>
	
	
	<p style="margin-top: 30px;">
	Cordialement,<br>
	<strong>
	Direction Régionale des Impôts — Manakara
	</strong>
	</p>
	
	</div>
	
	
	<p style="
	text-align: center;
	color: #94a3b8;
	font-size: 12px;
	margin-top: 20px;
	">
	Cet email a été envoyé automatiquement par
	le Portail Contribuable.
	</p>
	
	</div>
	`
	
	
	const text = `
	Bonjour ${nom || 'Contribuable'},
	
	${message}
	
	Détails du rendez-vous :
	
	Service : ${service || 'Service fiscal'}
	Date    : ${date}
	Heure   : ${heure}
	
	Nous vous invitons à vous présenter à l'heure prévue.
	
	Cordialement,
	
	Direction Régionale des Impôts — Manakara
	`
	
	
	await transporter.sendMail({
		from: process.env.EMAIL_FROM,
		to,
		subject,
		text,
		html
	})
	
	console.log(
		`📧 Rappel ${type} envoyé à ${to}`
	)
}
