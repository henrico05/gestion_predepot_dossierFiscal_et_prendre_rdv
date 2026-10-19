<script setup>
// Aucune logique spécifique, simplement le design statique
</script>

<template>
    <header class="bg-[#0b2a5b] text-white py-4 px-8 h-28 flex items-center">
        <div class="max-w-6xl mx-auto w-full flex justify-between items-center">

            <!-- Logo et Titre -->
            <div class="flex items-center gap-4">
                <!-- Logo (Emblème rond rouge/blanc/vert) -->
                <div class="w-16 h-16 rounded-full border-2 border-white bg-white p-1">
                    <!-- Placeholder pour l'image du logo -->
                    <div
                        class="w-full h-full rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-xl">
                        <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                            <path
                                d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 18l10-5-5-2.5-5 2.5z" />
                        </svg>
                    </div>
                </div>
                <div>
                    <h1 class="text-3xl font-bold tracking-wide">IMPOTS Manakara</h1>
                    <p class="text-sm text-gray-300 mt-1 flex items-center gap-2">
                        <span class="h-4 w-1 bg-white inline-block"></span>
                        Portail d'accueil hybride
                    </p>
                </div>
            </div>

            <!-- Badge République -->
            <div class="border border-white/40 rounded-lg px-5 py-3 flex items-center gap-4">
                <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4">
                    </path>
                </svg>
                <div class="text-sm leading-tight">
                    <p class="font-semibold">République de Madagascar</p>
                    <p class="text-xs text-gray-300 mb-1">Impôts - Service Public</p>
                    <!-- Drapeau -->
                    <div class="flex h-1.5 w-20 overflow-hidden rounded-sm">
                        <div class="w-1/3 bg-white"></div>
                        <div class="w-1/3 bg-red-600"></div>
                        <div class="w-1/3 bg-green-600"></div>
                    </div>
                </div>
            </div>
        </div>
    </header>
</template>
