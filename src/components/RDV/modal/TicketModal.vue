<template>
<transition name="fade">
<div v-if="show" class="ticket-overlay" @click.self="emit('close')">
<div class="ticket-modal">
<div id="ticket-print-area" class="ticket-print">
<div class="ticket-header">
<div class="ticket-icon">🎫</div>
<div>
<span class="summary-eyebrow">RENDEZ-VOUS CONFIRMÉ</span>
<h3>Votre ticket</h3>
</div>
</div>
<div class="ticket-number">
<span>Numéro de ticket</span>
<strong>{{ ticket?.numero_ticket || '—' }}</strong>
</div>
<div class="ticket-divider"></div>
<dl class="summary-list">
<div class="summary-row"><dt>Contribuable</dt><dd>{{ ticket?.contribuable?.nom_raison_sociale || '—' }}</dd></div>
<div class="summary-row"><dt>NIF</dt><dd>{{ ticket?.contribuable?.nif || '—' }}</dd></div>
<div class="summary-row"><dt>Service</dt><dd>{{ ticket?.service?.libelle_service || '—' }}</dd></div>
<div class="summary-row"><dt>Date</dt><dd>{{ formatDate(ticket?.date_ticket) }}</dd></div>
<div class="summary-row"><dt>Heure</dt><dd>{{ ticket?.heure_ticket || '—' }}</dd></div>
<div class="summary-row"><dt>Statut</dt><dd>{{ ticket?.statut || 'RESERVE' }}</dd></div>
</dl>
<div class="ticket-message">
<strong>Veuillez conserver votre ticket.</strong>
<p>Présentez-vous au service fiscal à la date et l'heure indiquées.</p>
</div>
</div>
<div class="ticket-actions">
<button type="button" class="btn-print" :disabled="isPrinting" @click="emit('print')">
{{ isPrinting ? 'Impression…' : 'Imprimer le ticket' }}
</button>
<button type="button" class="btn-no-print" @click="emit('close')">Fermer</button>
</div>
</div>
</div>
</transition>
</template>

<script setup>
defineProps({
	show: Boolean,
	ticket: Object,
	isPrinting: Boolean
})
const emit = defineEmits(['close', 'print'])

function formatDate(iso) {
	if (!iso) return '—'
		const [y, m, d] = String(iso).slice(0, 10).split('-')
		const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
		return `${d} ${months[Number(m) - 1]} ${y}`
}
</script>

<style scoped>
.ticket-overlay {
	position: fixed;
	inset: 0;
	z-index: 90;
	background: rgba(15, 23, 42, 0.55);
	display: grid;
	place-items: center;
	padding: 16px;
}
.ticket-modal {
	width: min(420px, 100%);
	background: var(--card);
	border: 1px solid var(--border);
	border-radius: 16px;
	padding: 18px;
}
.ticket-print { padding: 4px; }
.ticket-header {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 12px;
}
.ticket-icon { font-size: 28px; }
.summary-eyebrow {
	font-size: 10px;
	letter-spacing: .08em;
	color: var(--text-muted);
	font-weight: 700;
}
.ticket-header h3 {
	margin: 2px 0 0;
	font-size: 17px;
	font-weight: 800;
	color: var(--text);
}
.ticket-number {
	text-align: center;
	padding: 16px 8px;
	margin: 12px 0;
	border-radius: 12px;
	background: var(--bgListCard);
	color: var(--textListCard);
}
.ticket-number span {
	display: block;
	font-size: 12px;
	margin-bottom: 4px;
}
.ticket-number strong {
	font-size: 28px;
	letter-spacing: 1px;
}
.ticket-divider {
	border-top: 1px dashed var(--border);
	margin: 12px 0;
}
.summary-list { margin: 0; padding: 0; }
.summary-row {
	display: flex;
	justify-content: space-between;
	gap: 8px;
	padding: 6px 0;
	font-size: 13px;
}
.summary-row dt { color: var(--text-muted); }
.summary-row dd { margin: 0; font-weight: 700; text-align: right; color: var(--text); }
.ticket-message {
	margin-top: 14px;
	padding: 10px 14px;
	border-radius: 10px;
	background: var(--hover);
	font-size: 12.5px;
	color: var(--text);
}
.ticket-message p { margin: 4px 0 0; color: var(--text-muted); }
.ticket-actions {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-top: 14px;
}
.btn-print, .btn-no-print {
	width: 100%;
	padding: 11px;
	border-radius: 10px;
	font-weight: 700;
	cursor: pointer;
	font-size: 13.5px;
}
.btn-print {
	border: 0;
	background: var(--titlebar);
	color: #fff;
}
.btn-print:hover:not(:disabled) { opacity: .92; }
.btn-print:disabled { opacity: .6; cursor: not-allowed; }
.btn-no-print {
	background: transparent;
	border: 1px solid var(--border);
	color: var(--text);
}
.btn-no-print:hover { background: var(--hover); }

.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
