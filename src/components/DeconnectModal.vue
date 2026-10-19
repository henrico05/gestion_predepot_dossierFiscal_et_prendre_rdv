<template>
<Teleport to="body">
<Transition name="modal">
<div
v-if="isOpen"
class="modal-backdrop"
@click.self="closeModal"
>
<div class="modal-content">
<!-- Bouton fermer -->
<button
@click="closeModal"
type="button"
class="modal-close"
aria-label="Fermer"
>
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
</svg>
</button>

<!-- Icône -->
<div class="modal-icon">
<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
<path stroke-linecap="round" stroke-linejoin="round"
d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
</svg>
</div>

<!-- Texte -->
<p class="modal-text">
Voulez-vous vous déconnecter ?
</p>

<!-- Actions -->
<div class="modal-actions">
<button
@click="closeModal"
type="button"
class="btn-cancel"
>
Non, revenir
</button>
<button
@click="logout"
type="button"
class="btn-confirm"
>
Oui, je confirme
</button>
</div>
</div>
</div>
</Transition>
</Teleport>
</template>

<script setup>
defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['deconnect', 'close'])

const closeModal = () => {
  emit('close')
}

const logout = () => {
  emit('deconnect')
}
</script>

<style scoped>
/* =====================================================
 * BACKDROP
 * ===================================================== */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  will-change: opacity;
}

/* =====================================================
 * CONTENU DE LA MODAL
 * ===================================================== */
.modal-content {
  position: relative;
  width: 100%;
  max-width: 420px;
  background: var(--bg);
  color: var(--text);
  border-radius: 18px;
  padding: 24px 24px 22px;
  box-shadow:
  0 20px 40px -10px rgba(0, 0, 0, 0.3),
  0 8px 16px -4px rgba(0, 0, 0, 0.15);
  text-align: center;
  will-change: transform, opacity;
}

/* Bouton fermer */
.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}

.modal-close:hover {
  background: var(--hover);
  color: var(--text);
}

/* Icône centrale */
.modal-icon {
  width: 62px;
  height: 62px;
  margin: 0 auto 18px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Texte */
.modal-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
  margin: 0 0 22px;
  line-height: 1.5;
}

/* Actions */
.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-cancel,
.btn-confirm {
  padding: 10px 20px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-family: inherit;
}

.btn-cancel {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-cancel:hover {
  background: var(--hover);
}

.btn-confirm {
  background: #ef4444;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
}

.btn-confirm:hover {
  background: #dc2626;
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.35);
}

/* =====================================================
 * TRANSITIONS
 * ===================================================== */

/* Fade du backdrop */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* =====================================================
 * CONTENU — SLIDE HORIZONTAL
 * ===================================================== */

/* Entrée : depuis la GAUCHE */
.modal-enter-active .modal-content {
  transition:
  transform 0.35s cubic-bezier(0.34, 1.2, 0.64, 1),
  opacity 0.3s ease;
}

.modal-enter-from .modal-content {
  opacity: 0;
  transform: translateX(-100%);
}

/* Sortie : vers la DROITE */
.modal-leave-active .modal-content {
  transition:
  transform 0.3s cubic-bezier(0.6, 0, 0.8, 0.2),
  opacity 0.3s ease;
}

.modal-leave-to .modal-content {
  opacity: 0;
  transform: translateX(100%);
}
</style>
