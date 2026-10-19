<script setup>
const stats = [
	{ label: 'Tickets en attente', value: 12, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: 'blue' },
{ label: 'Dossiers traités', value: 8, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'green' },
{ label: 'Durée moyenne', value: '15 min', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'orange' },
{ label: 'Nouvelles demandes', value: 3, icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', color: 'purple' }
];
</script>

<template>
<div class="stats-grid">
<div v-for="stat in stats" :key="stat.label" class="stat-card">
<div class="stat-info">
<p class="stat-label">{{ stat.label }}</p>
<p class="stat-value">{{ stat.value }}</p>
</div>
<div :class="['stat-icon', stat.color]">
<!-- SVG -->
</div>
</div>
</div>
</template>
