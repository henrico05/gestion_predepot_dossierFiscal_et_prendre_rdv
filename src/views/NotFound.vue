<template>
<div class="not-found-page">

<!-- Fond animé : cercles flottants -->
<div class="bg-decorations">
<div class="circle circle-1"></div>
<div class="circle circle-2"></div>
<div class="circle circle-3"></div>
</div>

<div class="content">

<!-- Code 404 avec effet glitch -->
<h1 class="error-code" data-text="404">
404
</h1>

<!-- Illustration SVG (boussole cassée / point d'interrogation) -->
<div class="illustration">
<svg viewBox="0 0 200 200" fill="none" stroke="currentColor">
<!-- Cercle extérieur -->
<circle cx="100" cy="100" r="80" stroke-width="2" opacity="0.3" stroke-dasharray="4 6"/>
<!-- Boussole -->
<circle cx="100" cy="100" r="60" stroke-width="3"/>
<circle cx="100" cy="100" r="8" fill="currentColor"/>
<!-- Aiguille cassée -->
<path d="M100 40 L115 100 L100 80 L85 100 Z" fill="currentColor" opacity="0.8"/>
<!-- Point d'interrogation -->
<text x="100" y="155" text-anchor="middle" font-size="32" font-weight="900" fill="currentColor">?</text>
</svg>
</div>

<!-- Titre -->
<h2 class="title">Page introuvable</h2>

<!-- Description -->
<p class="description">
Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
Vérifiez l'URL ou retournez à l'accueil.
</p>

<!-- Actions -->
<div class="actions">
<button type="button" class="btn-primary" @click="goHome">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
</svg>
Retour à l'accueil
</button>

<button type="button" class="btn-ghost" @click="goBack">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
</svg>
Page précédente
</button>
</div>

<!-- Aide contextuelle -->
<p class="help-text">
Besoin d'aide ? <a href="#" @click.prevent="contactSupport">Contactez le support</a>
</p>
</div>
</div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'

const router = useRouter()

const goHome = () => {
    router.push('/')
}

const goBack = () => {
    if (window.history.length > 1) {
        router.back()
    } else {
        router.push('/')
    }
}

const contactSupport = () => {
    window.location.href = 'mailto:support@impots-manakara.mg'
}

onMounted(() => {
    // Animation du code 404
    gsap.from('.error-code', {
        y: -50,
        opacity: 0,
        scale: 0.8,
        duration: 0.8,
        ease: 'back.out(1.7)'
    })
    
    // Animation de l'illustration
    gsap.from('.illustration', {
        scale: 0,
        rotation: -180,
        opacity: 0,
        duration: 1,
        delay: 0.2,
        ease: 'power3.out'
    })
    
    // Animation du titre et description
    gsap.from(['.title', '.description'], {
        y: 30,
        opacity: 0,
        duration: 0.6,
        delay: 0.5,
        stagger: 0.15,
        ease: 'power2.out'
    })
    
    // Animation des boutons
    gsap.from('.btn-primary, .btn-ghost', {
        y: 20,
        opacity: 0,
        duration: 0.5,
        delay: 0.9,
        stagger: 0.1,
        ease: 'power2.out'
    })
    
    // Animation du texte d'aide
    gsap.from('.help-text', {
        opacity: 0,
        duration: 0.6,
        delay: 1.2
    })
    
    // Animation des cercles flottants en boucle
    gsap.to('.circle-1', {
        y: -30,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    })
    gsap.to('.circle-2', {
        y: 20,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.5
    })
    gsap.to('.circle-3', {
        x: 25,
        y: -15,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 1
    })
})
</script>

<style scoped>
/* ========================================================== */
/* VARIABLES DE THÈME                                         */
/* ========================================================== */
:root {
    --bg: #f1f5f9;
    --card: #ffffff;
    --text: #1e293b;
    --text-muted: #64748b;
    --border: #e2e8f0;
    --primary: #3b82f6;
    --hover: #f8fafc;
}

.dark {
    --bg: #0f172a;
    --card: #1e293b;
    --text: #f1f5f9;
    --text-muted: #94a3b8;
    --border: #334155;
    --primary: #60a5fa;
    --hover: #334155;
}

/* ========================================================== */
/* PAGE                                                       */
/* ========================================================== */
.not-found-page {
    position: relative;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
    color: var(--text);
    font-family: Inter, system-ui, sans-serif;
    padding: 24px;
    overflow: hidden;
}

/* ========================================================== */
/* DÉCORATIONS DE FOND                                        */
/* ========================================================== */
.bg-decorations {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
}
.circle {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.15;
}
.circle-1 {
    width: 300px;
    height: 300px;
    background: var(--primary);
    top: 10%;
    left: 5%;
}
.circle-2 {
    width: 400px;
    height: 400px;
    background: #a855f7;
    bottom: 5%;
    right: 10%;
}
.circle-3 {
    width: 250px;
    height: 250px;
    background: #10b981;
    top: 40%;
    right: 30%;
}

/* ========================================================== */
/* CONTENU                                                    */
/* ========================================================== */
.content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 540px;
    width: 100%;
}

/* ========================================================== */
/* CODE 404                                                   */
/* ========================================================== */
.error-code {
    font-size: clamp(80px, 15vw, 140px);
    font-weight: 900;
    line-height: 1;
    letter-spacing: -0.05em;
    margin: 0 0 16px;
    color: var(--primary);
    position: relative;
    text-shadow: 0 4px 20px color-mix(in srgb, var(--primary) 30%, transparent);
}
.error-code::before,
.error-code::after {
    content: attr(data-text);
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0.5;
}
.error-code::before {
    color: #ec4899;
    animation: glitch-1 2.5s infinite;
    clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
}
.error-code::after {
    color: #10b981;
    animation: glitch-2 2.5s infinite;
    clip-path: polygon(0 55%, 100% 55%, 100% 100%, 0 100%);
}

@keyframes glitch-1 {
    0%, 90%, 100% { transform: translate(0); }
    92% { transform: translate(-3px, 2px); }
    94% { transform: translate(3px, -2px); }
    96% { transform: translate(-2px, -1px); }
}
@keyframes glitch-2 {
    0%, 90%, 100% { transform: translate(0); }
    93% { transform: translate(3px, -2px); }
    95% { transform: translate(-3px, 2px); }
    97% { transform: translate(2px, 1px); }
}

/* ========================================================== */
/* ILLUSTRATION                                               */
/* ========================================================== */
.illustration {
    width: 140px;
    height: 140px;
    margin-bottom: 20px;
    color: var(--primary);
}
.illustration svg {
    width: 100%;
    height: 100%;
}

/* ========================================================== */
/* TEXTES                                                     */
/* ========================================================== */
.title {
    font-size: clamp(22px, 4vw, 28px);
    font-weight: 800;
    margin: 0 0 12px;
    color: var(--text);
}

.description {
    font-size: 14.5px;
    line-height: 1.6;
    color: var(--text-muted);
    margin: 0 0 28px;
    max-width: 420px;
}

/* ========================================================== */
/* ACTIONS                                                    */
/* ========================================================== */
.actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
    margin-bottom: 24px;
    width: 100%;
}

.btn-primary, .btn-ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 22px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    border: 0;
    transition: all 0.2s ease;
    white-space: nowrap;
}
.btn-primary {
    background: var(--primary);
    color: #fff;
    box-shadow: 0 4px 14px color-mix(in srgb, var(--primary) 35%, transparent);
}
.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px color-mix(in srgb, var(--primary) 45%, transparent);
    filter: brightness(1.05);
}
.btn-ghost {
    background: var(--card);
    color: var(--text);
    border: 1px solid var(--border);
}
.btn-ghost:hover {
    background: var(--hover);
    transform: translateY(-2px);
}
.btn-primary svg,
.btn-ghost svg {
    width: 16px;
    height: 16px;
}

/* ========================================================== */
/* TEXTE D'AIDE                                               */
/* ========================================================== */
.help-text {
    font-size: 13px;
    color: var(--text-muted);
}
.help-text a {
    color: var(--primary);
    font-weight: 600;
    text-decoration: none;
    transition: opacity 0.2s;
}
.help-text a:hover {
    text-decoration: underline;
    opacity: 0.85;
}

/* ========================================================== */
/* RESPONSIVE                                                 */
/* ========================================================== */
@media (max-width: 480px) {
    .actions {
        flex-direction: column;
    }
    .btn-primary, .btn-ghost {
        width: 100%;
    }
    .illustration {
        width: 110px;
        height: 110px;
    }
}
</style>
