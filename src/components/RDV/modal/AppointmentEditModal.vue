<script setup>
import { computed, reactive, ref, watch ,onMounted } from 'vue'
import api from '@/api/Axios'

const props = defineProps({
  appointment: {
    type: Object,
    default: null
  },
  show: {
    type: Boolean,
    default: false
  },
  isSaving: {
    type: Boolean,
    default: false
  }
})

const services = ref([])

const fetchServices = async () => {
  try {
    const res = await api.get('/services-fiscaux')
    
    if (res.data?.success) {
      services.value = res.data.data
    }
    
    console.log("service ressue : ",services.value)
    
  } catch (err) {
    console.error('Erreur chargement services :', err)
    console.error('Réponse serveur :', err.response?.data)
  }
}

const emit = defineEmits(['close', 'save'])

const form = reactive({
  date_rdv: '',
  heure_rdv: '',
  id_service: '',
  commentaire: ''
})

/* ============================================================
 * VALIDATION DATE
 * ============================================================ */
const estJourTravail = (dateStr) => {
  if (!dateStr) return true
    const d = new Date(dateStr + 'T00:00:00')
    const jour = d.getDay()   // 0 = dimanche, 6 = samedi
    return jour !== 0 && jour !== 6
}

const dateErrorMessage = computed(() => {
  if (!form.date_rdv) return ''
    if (!estJourTravail(form.date_rdv)) {
      return 'Les rendez-vous sont disponibles uniquement du lundi au vendredi.'
    }
    return ''
})

/* Bloquer aussi les dates dans le passé */
const dateMin = computed(() => {
  return new Date().toISOString().slice(0, 10)
})

const errorMessage = ref('')

const formatDateForInput = (value) => {
  if (!value) return ''
  return String(value).slice(0, 10)
}

const formatTimeForInput = (value) => {
  if (!value) return ''
  return String(value).slice(0, 5)
}

const resetForm = () => {
  if (!props.appointment) return

  form.date_rdv = formatDateForInput(props.appointment.date_rdv)
  form.heure_rdv = formatTimeForInput(props.appointment.heure_rdv)
  form.id_service = props.appointment.id_service ?? ''
  form.commentaire = props.appointment.commentaire ?? ''
  errorMessage.value = ''
}

watch(() => props.open, (value) => {
  if (value && props.appointment) {
    form.date_rdv = props.appointment.date_rdv
      form.heure_rdv = props.appointment.heure_rdv?.slice(0, 5) || ''
        form.id_service = props.appointment.id_service ?? props.appointment.service?.id_service ?? null
          form.commentaire = props.appointment.commentaire || ''
            errorMessage.value = ''
  }
})

watch(
  () => [props.show, props.appointment],
  ([show]) => {
    if (show) resetForm()
  },
  { immediate: true }
)

const canSubmit = computed(() => {
  return Boolean(
    form.date_rdv &&
    form.heure_rdv &&
    form.id_service
  ) && !props.isSaving
  && !dateErrorMessage.value
})

const submit = () => {
  errorMessage.value = ''

  if (!form.date_rdv || !form.heure_rdv || !form.id_service) {
    errorMessage.value = 'Veuillez renseigner la date, l’heure et le service.'
    return
  }

  emit('save', {
    date_rdv: form.date_rdv,
    heure_rdv: form.heure_rdv,
    id_service: Number(form.id_service),
    commentaire: form.commentaire.trim()
  })
}

onMounted(fetchServices)

</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show && appointment"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4"
        @click.self="emit('close')"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

        <div
          class="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-gray-200 dark:border-slate-700"
        >
          <!-- En-tête -->
          <div class="sticky top-0 z-10 flex items-center justify-between px-6 py-5 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Rendez-vous #{{ appointment.id_rdv }}
              </p>
              <h2 class="text-xl font-bold text-gray-900 dark:text-white mt-1">
                Modifier le rendez-vous
              </h2>
            </div>

            <button
              type="button"
              class="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              :disabled="isSaving"
              @click="emit('close')"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form class="p-6 space-y-5" @submit.prevent="submit">
            <div class="rounded-xl bg-gray-50 dark:bg-slate-800/70 p-4">
              <p class="text-xs text-gray-500 dark:text-gray-400">Contribuable</p>
              <p class="font-semibold text-gray-900 dark:text-white">
                {{ appointment.contribuable?.nom_raison_sociale || 'Contribuable inconnu' }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                NIF {{ appointment.contribuable?.nif || '—' }}
              </p>
            </div>

            <div
              v-if="errorMessage"
              class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/20 px-4 py-3 text-sm text-red-700 dark:text-red-400"
            >
              {{ errorMessage }}
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                  Date
                </label>
                <input
                  v-model="form.date_rdv"
                  type="date"
                  :min="new Date().toISOString().slice(0, 10)"
                  class="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  :disabled="isSaving"
                >
                
                <p v-if="dateErrorMessage" class="mt-1.5 text-xs text-red-600 dark:text-red-400">
                {{ dateErrorMessage }}
                </p>
                
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                  Heure
                </label>
                <input
                  v-model="form.heure_rdv"
                  type="time"
                  class="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  :disabled="isSaving"
                >
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                Service fiscal
              </label>

              <select
                v-model="form.id_service"
                class="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                :disabled="isSaving"
              >
              <option :value="null" disabled>Sélectionnez un service</option>
              <option v-for="s in services" :key="s.id_service" :value="s.id_service">{{ s.libelle_service }}</option>
              </select>

              <p v-if="!services.length" class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Aucun service fourni au composant.
              </p>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                Commentaire
              </label>

              <textarea
                v-model="form.commentaire"
                rows="4"
                maxlength="500"
                placeholder="Ajouter un commentaire..."
                class="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none"
                :disabled="isSaving"
              ></textarea>
            </div>

            <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <button
                type="button"
                class="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                :disabled="isSaving"
                @click="emit('close')"
              >
                Annuler
              </button>

              <button
                type="submit"
                :disabled="!canSubmit"
                class="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition inline-flex items-center justify-center gap-2"
              >
                <span
                  v-if="isSaving"
                  class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                ></span>
                {{ isSaving ? 'Enregistrement...' : 'Enregistrer les modifications' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
