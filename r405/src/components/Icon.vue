<script setup>
defineProps({ name: { type: String, default: "arrow" } });
const paths = {
  radar: "M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5m-5 0 9-9M12 12h.01",
  sliders: "M4 7h4m4 0h8M4 17h8m4 0h4M8 4v6m4 4v6",
  sort: "M5 4v16m-3-3 3 3 3-3M12 5h9m-9 7h6m-6 7h3",
  list: "M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  "arrow-up": "M12 19V5m-6 6 6-6 6 6",
  compass: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM16 8l-3 5-5 3 3-5 5-3Z",
  bookmark: "M6 4h12v17l-6-4-6 4V4Z",
  layers: "m3 7 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 17l9 5 9-5",
  grid: "M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z",
  wallet:
    "M20 8V5H4a2 2 0 0 0 0 4h17v11H4a2 2 0 0 1-2-2V7m19 5h-6v5h6m-3-2.5h.01",
  fingerprint:
    "M8 20c2-2 2-5 2-8a2 2 0 0 1 4 0c0 4 0 7-2 10M4 17c2-2 2-4 2-6a6 6 0 0 1 12 0c0 5 0 7-1 9M2 11a10 10 0 0 1 20 0v4",
  search: "M20 20l-5-5m2-6a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
  sun: "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
  ring:
    "M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM3 18c-3-4 14-17 18-12 3 4-14 17-18 12Z",
  mountain: "m2 19 7-14 5 9 3-5 5 10H2Zm4-8 3 2 3-2",
  plus: "M12 5v14M5 12h14",
  close: "m6 6 12 12M6 18 18 6",
  check: "m5 12 4 4L19 6",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  refresh: "M20 7v5h-5M4 17v-5h5m10-4a8 8 0 0 0-14-2m0 10a8 8 0 0 0 14 2",
  copy: "M8 8h12v13H8V8Zm-4 8H2V2h12v2",
  info: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v6m0-10v.01",
};
</script>
<template>
  <svg
    class="pb-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || paths.arrow" />
  </svg>
</template>
