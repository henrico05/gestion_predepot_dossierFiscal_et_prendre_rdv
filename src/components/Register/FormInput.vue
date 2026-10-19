<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
	label: String,
	required: Boolean,
	type: { type: String, default: 'text' },
	placeholder: String,
	icon: String, // SVG path
	hint: String, // Texte sous le label
	modelValue: String
});

const emit = defineEmits(['update:modelValue']);
const showPassword = ref(false);

// Gestion du type d'input (pour les mots de passe)
const inputType = ref(props.type);
watch(() => props.type, (newVal) => { inputType.value = newVal; });

const togglePassword = () => {
	showPassword.value = !showPassword.value;
	inputType.value = showPassword.value ? 'text' : 'password';
};

const handleInput = (event) => {
	emit('update:modelValue', event.target.value);
};
</script>

<template>
<div class="flex flex-col gap-2">
<!-- Label et indicateur requis -->
<label class="text-sm font-medium text-[var(--text)]">
<span v-if="required" class="text-red-500 mr-1">*</span>
{{ label }}
</label>

<!-- Texte d'aide (ex: "Minimum 8 caractères...") -->
<p v-if="hint" class="text-xs text-[var(--text-muted)] -mt-1">{{ hint }}</p>

<!-- Conteneur de l'input -->
<div class="relative">
<!-- Icône gauche -->
<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="icon"></path>
</svg>
</div>

<!-- Input -->
<input 
:type="inputType"
:value="modelValue"
@input="handleInput"
:placeholder="placeholder"
class="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm outline-none transition-colors
bg-[var(--card)] text-[var(--text)] border border-[var(--border)]
placeholder:text-[var(--text-muted)]
focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
/>

<!-- Bouton œil (uniquement pour les mots de passe) -->
<button 
v-if="type === 'password'" 
@click="togglePassword"
type="button"
class="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
>
<svg v-if="!showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
</svg>
<svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
</svg>
</button>
</div>
</div>
</template>
