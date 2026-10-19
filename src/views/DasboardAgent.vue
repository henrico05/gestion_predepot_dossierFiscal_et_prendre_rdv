<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import TitleBar from '../components/DashboardComponents/TitleBar.vue'
import Sidebar from '../components/DashboardComponents/Sidebar.vue'
import { socket, connectSocket } from '@/services/socket'

const isDark = ref(false)
const route = useRoute()

/* ============================================================
 * THÈME
 * ============================================================ */
const toggleTheme = () => {
    isDark.value = !isDark.value
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

/* ============================================================
 * HEADER — Titre et sous-titre depuis la route
 * ============================================================ */
const pageTitle = computed(() => route.meta.title || 'Tableau de bord')

const pageSubtitle = computed(() => {
    /* Priorité 1 : meta de la route */
    if (route.meta.subtitle) return route.meta.subtitle
        
        /* Fallback : switch par nom de route */
        switch (route.name) {
            case 'Dashboard':       return 'Bienvenue sur votre espace agent'
            case 'Dossiers':        return 'Consultez et gérez les dossiers fiscaux'
            case 'RendezVous':      return 'Gérez vos rendez-vous'
            case 'servicesFiscal':  return 'Gérez les services proposés aux contribuables'
            case 'userSpace':       return 'Gérez les comptes des agents'
            case 'Ticket':          return 'File d\'attente et appels de tickets'
            case 'ListGuichet':     return 'Supervision des guichets'
            case 'Statistiques':    return 'Statistiques et rapports'
            default:                return 'Bienvenue, Agent'
        }
})

/* ============================================================
 * DATE / HEURE
 * ============================================================ */
const currentDate = computed(() => {
    return new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
})

/* ============================================================
 * CONNEXION SOCKET (une seule fois ici)
 * ============================================================ */
onMounted(() => {
    /* Thème */
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') isDark.value = true
        
        /* ⭐ Connexion Socket UNE SEULE FOIS pour toute l'app */
        connectSocket()
})
</script>

<template>
   <div :class="['app-container', isDark ? 'dark' : '']">

   <!-- Barre de titre Electron -->
  <TitleBar :is-dark="isDark" @toggle-theme="toggleTheme" />
 <!-- Layout Principal -->
<div class="main-layout">
<Sidebar />
<!-- le contenair au milieu de dasboard -->

<main class="content">
<header class="content-header bg-[var(--card)]/70 backdrop-blur-lg z-30">
<div>
<h2 class="page-title">{{ pageTitle }}</h2>
<p class="page-subtitle"> {{ pageSubtitle }}</p>
</div>
<div class="header-right">
<slot name="header-actions" />
<div class="badge">{{ currentDate }}</div>
</div>

</header>
   <!--le corps interagir avec vue router-->
   <div class="router-content">
     <RouterView />
   </div>
</main>
</div>

</div>
</template>

<style lang="css">
/* ========== VARIABLES & THEME ========== */
.app-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    overflow: hidden;
    transition: background 0.3s, color 0.3s;
}

.app-container {
    background: var(--bg);
    color: var(--text);
}

/* ========== TITLE BAR ========== */
.title-bar {
    height: 38px;
    background: var(--titlebar);
    color: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 6px 0 14px;
    -webkit-app-region: drag;
    user-select: none;
    flex-shrink: 0;
}

.title-bar-left {
    display: flex;
    align-items: center;
    gap: 10px;
}

.logo-circle {
    width: 22px;
    height: 22px;
    background: #3b82f6;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    color: white;
}

.logo-circle.large {
    width: 40px;
    height: 40px;
    font-size: 16px;
}

.title-text {
    font-size: 13px;
    font-weight: 500;
    opacity: 0.95;
}

.window-controls {
    display: flex;
    height: 100%;
    -webkit-app-region: no-drag;
}

.control-btn {
    width: 36px;
    height: 100%;
    border: none;
    background: transparent;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s;
    border-radius: 80%;
}

.control-btn:hover {
    background: rgba(255, 255, 255, 0.12);
}

.control-btn.close:hover {
    background: #e81123;
}

.theme-btn {
    margin-right: 4px;
}

/* ========== LAYOUT ========== */
.main-layout {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

/* ========== SIDEBAR ========== */
.sidebar {
    width: 260px;
    background: var(--sidebar);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    transition: background 0.3s, border 0.3s;
}

.sidebar-header {
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid var(--border);
}

.sidebar-title {
    font-size: 16px;
    font-weight: 700;
}

.sidebar-subtitle {
    font-size: 12px;
    color: var(--text-muted);
}
.router-content {
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow-y: auto;
    overflow-x: hidden;
    
    /* Cache la scrollbar */
    scrollbar-width: none;
    -ms-overflow-style: none;
}

.router-content::-webkit-scrollbar {
    display: none;
}
.sidebar-nav {
    flex: 1;
    padding: 12px 0;
    overflow-y: auto;
}

.nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 20px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-muted);
    text-decoration: none;
    transition: all 0.2s;
    border-right: 3px solid transparent;
}

.nav-item:hover {
    background: var(--hover);
    color: var(--text);
}

.nav-item.active {
    background: rgba(59, 130, 246, 0.1);
    color: var(--primary);
    border-right-color: var(--primary);
}

.nav-icon {
    width: 20px;
    height: 20px;
}

.sidebar-footer {
    padding: 16px;
    border-top: 1px solid var(--border);
}

.logout-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px;
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: none;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.logout-btn:hover {
    background: rgba(239, 68, 68, 0.2);
}

/* ========== CONTENT ========== */
.content {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.content-header {
    padding: 15px 25px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    
   
}

.page-title {
    font-size: 20px;
    font-weight: 700;
}

.page-subtitle {
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 2px;
    
}

.header-right {
    display: flex;
    align-items: center;
    gap: 12px;
}

.badge,
.status-badge {
    padding: 6px 12px;
    background: var(--bg);
    border-radius: 20px;
    font-size: 13px;
    color: var(--text-muted);
}

.status-badge {
    display: flex;
    align-items: center;
    gap: 6px;
}

.status-dot {
    width: 8px;
    height: 8px;
    background: #22c55e;
    border-radius: 50%;
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
}

.content-body {
    flex: 1;
    padding: 24px 28px;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
}

/* ========== STATS ========== */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 18px;
    margin-bottom: 24px;
}

.stat-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.25s;
    cursor: default;
}

.stat-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
}

.stat-label {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 6px;
}

.stat-value {
    font-size: 26px;
    font-weight: 700;
}

.stat-icon {
    width: 46px;
    height: 46px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.stat-icon.blue {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
}

.stat-icon.green {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
}

.stat-icon.orange {
    background: rgba(249, 115, 22, 0.15);
    color: #f97316;
}

.stat-icon.purple {
    background: rgba(168, 85, 247, 0.15);
    color: #a855f7;
}

/* ========== BOTTOM GRID ========== */
.bottom-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 20px;
}

.card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
}

.card-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg);
}

.card-header h3 {
    font-size: 15px;
    font-weight: 600;
}

.card-time {
    font-size: 12px;
    color: var(--text-muted);
}

.table-container {
    overflow-x: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

th {
    text-align: left;
    padding: 12px 18px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    background: var(--bg);
}

td {
    padding: 14px 18px;
    border-top: 1px solid var(--border);
}

.ticket-row {
    transition: background 0.15s;
}

.ticket-row:hover {
    background: var(--hover);
}

.ticket-num {
    font-weight: 700;
}

.status-pill {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    background: rgba(34, 197, 94, 0.15);
    color: #16a34a;
}

/* ========== ACTIONS ========== */
.actions-card {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.card-title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 4px;
}

.action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
}

.action-btn:hover {
    transform: translateY(-1px);
    filter: brightness(1.08);
}

.action-btn:active {
    transform: translateY(0);
}

.action-btn.primary {
    background: #3b82f6;
}

.action-btn.success {
    background: #22c55e;
}

.action-btn.danger {
    background: #ef4444;
}
</style>
