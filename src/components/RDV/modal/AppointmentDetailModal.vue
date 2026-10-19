<template>
<transition name="fade">
<div v-if="show" class="modal-overlay" @click.self="emit('close')">
<div class="modal-content-anim modal-box">
<!-- Header -->
<div class="modal-header">
<div>
<h2>Détails du rendez-vous</h2>
<p>RDV #{{ appointment?.id_rdv }} · {{ formatDate(appointment?.date_rdv) }}</p>
</div>
<button type="button" class="modal-close" @click="emit('close')">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
</svg>
</button>
</div>

<!-- Contenu -->
<div class="modal-body">
<!-- Statut -->
<div class="status-banner" :style="{ background: statusStyle.bg, borderColor: statusStyle.border, color: statusStyle.text }">
<span>{{ statusStyle.icon }}</span>
<strong>{{ appointment?.statut_rdv || 'EN_ATTENTE' }}</strong>
</div>

<!-- Contribuable -->
<div class="section">
<h3>Contribuable</h3>
<div class="info-row"><span>Nom / Raison sociale</span><strong>{{ appointment?.contribuable?.nom_raison_sociale || '—' }}</strong></div>
<div class="info-row"><span>NIF</span><strong>{{ appointment?.contribuable?.nif || '—' }}</strong></div>
<div class="info-row"><span>Téléphone</span><strong>{{ appointment?.contribuable?.telephone || '—' }}</strong></div>
</div>

<!-- RDV -->
<div class="section">
<h3>Rendez-vous</h3>
<div class="info-row"><span>Service</span><strong>{{ appointment?.service?.libelle_service || '—' }}</strong></div>
<div class="info-row"><span>Date</span><strong>{{ formatDate(appointment?.date_rdv) }}</strong></div>
<div class="info-row"><span>Heure</span><strong>{{ formatTime(appointment?.heure_rdv) }}</strong></div>
<div class="info-row"><span>Canal</span><strong>{{ appointment?.canal_creation || '—' }}</strong></div>
</div>

<!-- Commentaire -->
<div v-if="appointment?.commentaire" class="section">
<h3>Commentaire</h3>
<p class="comment-box">{{ appointment.commentaire }}</p>
</div>

<!-- Ticket -->
<div v-if="appointment?.ticket" class="section">
<h3>Ticket associé</h3>
<div class="info-row"><span>Numéro</span><strong>{{ appointment.ticket.numero_ticket }}</strong></div>
<div class="info-row"><span>Statut</span><strong>{{ appointment.ticket.statut_ticket }}</strong></div>
</div>
</div>

<!-- Actions -->
<div class="modal-actions">
<template v-if="appointment?.statut_rdv === 'EN_ATTENTE'">
<button type="button" class="btn-act btn-success" @click="emit('confirm', appointment)">Confirmer</button>
<button type="button" class="btn-act btn-primary" @click="emit('edit', appointment)">Modifier</button>
</template>
<template v-else-if="appointment?.statut_rdv === 'CONFIRME'">
<button type="button" class="btn-act btn-primary" @click="emit('checkin', appointment)">Marquer présent</button>
<button type="button" class="btn-act btn-outline-danger" @click="emit('absent', appointment)">Marquer absent</button>
<button v-if="appointment?.ticket?.numero_ticket" type="button" class="btn-act btn-outline" @click="emit('print', appointment)">Imprimer ticket</button>
</template>
<button
v-if="['EN_ATTENTE', 'CONFIRME'].includes(appointment?.statut_rdv)"
type="button"
class="btn-act btn-outline-danger"
@click="emit('cancel', appointment)"
>Annuler</button>
<button type="button" class="btn-act btn-outline" @click="emit('close')">Fermer</button>
</div>
</div>
</div>
</transition>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  appointment: Object,
  show: Boolean
})
const emit = defineEmits(['close', 'confirm', 'cancel', 'edit', 'absent', 'checkin', 'print'])

const STATUS_STYLES = {
  EN_ATTENTE: { bg: 'rgba(245, 158, 11, 0.12)', border: '#f59e0b', text: '#b45309', icon: '⏱' },
  CONFIRME: { bg: 'rgba(16, 185, 129, 0.12)', border: '#10b981', text: '#047857', icon: '✓' },
  HONORE: { bg: 'rgba(59, 130, 246, 0.12)', border: '#3b82f6', text: '#1d4ed8', icon: '★' },
  ABSENT: { bg: 'rgba(148, 163, 184, 0.12)', border: '#94a3b8', text: '#475569', icon: '✕' },
  ANNULE: { bg: 'rgba(239, 68, 68, 0.12)', border: '#ef4444', text: '#b91c1c', icon: '✕' }
}

const statusStyle = computed(() => {
  const s = String(props.appointment?.statut_rdv || 'EN_ATTENTE').toUpperCase()
  return STATUS_STYLES[s] || STATUS_STYLES.EN_ATTENTE
})

function formatDate(iso) {
  if (!iso) return '—'
    const [y, m, d] = String(iso).slice(0, 10).split('-')
    const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
    return `${d} ${months[Number(m) - 1]} ${y}`
}

function formatTime(t) {
  return t ? String(t).slice(0, 5) : '—'
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 16px;
}
.modal-box {
  width: min(520px, 100%);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--hover);
}
.modal-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
}
.modal-header p {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}
.modal-close {
  width: 32px; height: 32px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}
.modal-close:hover { background: var(--border); color: var(--text); }

.modal-body {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid;
  font-size: 13.5px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.section h3 {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: .04em;
}
.info-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 13px;
}
.info-row:last-child { border-bottom: 0; }
.info-row span { color: var(--text-muted); }
.info-row strong { color: var(--text); text-align: right; word-break: break-word; }

.comment-box {
  margin: 0;
  padding: 10px 14px;
  background: var(--hover);
  border-radius: 10px;
  font-size: 13px;
  font-style: italic;
  color: var(--text);
  border-left: 3px solid var(--primary);
}

.modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: var(--hover);
  justify-content: flex-end;
}
.btn-act {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border: 0;
  transition: all .2s;
  white-space: nowrap;
}
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { opacity: .92; transform: translateY(-1px); }
.btn-success { background: #10b981; color: #fff; }
.btn-success:hover { opacity: .92; transform: translateY(-1px); }
.btn-outline {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
}
.btn-outline:hover { background: var(--card); }
.btn-outline-danger {
  background: transparent;
  border: 1px solid #ef4444;
  color: #ef4444;
}
.btn-outline-danger:hover { background: rgba(239, 68, 68, 0.08); }

.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
