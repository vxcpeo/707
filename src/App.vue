<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { projects, dimensions } from "./data.js";
import { useRegistry } from "./useRegistry.js";
import Icon from "./components/Icon.vue";
import { readSavedProjects, writeSavedProjects } from "./storage.js";
const query = ref("");
const category = ref("All signals");
const sort = ref("score");
const savedOnly = ref(false);
const saved = ref([]);
const toast = ref("");
const storageAvailable = ref(true);
const layout = ref("rows");
const undoAction = ref(null);
const searchInput = ref(null);
let toastTimer;
function notify(message) {
  undoAction.value = null;
  toast.value = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value = "";
  }, 5500);
}
const {
  wallet,
  connecting,
  transaction,
  registryState,
  registryCount,
  registryEntries,
  registryAddress,
  registryReady,
  explorerUrl,
  explorerTransactionUrl,
  network,
  chainId,
  connectWallet,
  loadRegistry,
  submitPulse,
  checkConfirmation,
} = useRegistry(notify);
const submitting = computed(() =>
  ["signature", "confirming", "pending"].includes(transaction.value.phase),
);
const categories = [
  "All signals",
  "Builder cadence",
  "Holder breadth",
  "Liquidity health",
];
const activeFilterCount = computed(
  () => Number(!!query.value.trim()) + Number(category.value !== "All signals"),
);
function clearFilters() {
  query.value = "";
  category.value = "All signals";
}
const filteredProjects = computed(() =>
  projects
    .filter(
      (p) =>
        (!savedOnly.value || saved.value.includes(p.id)) &&
        (category.value === "All signals" || p.tag === category.value) &&
        `${p.name} ${p.ticker} ${p.tag} ${p.blurb}`
          .toLowerCase()
          .includes(query.value.trim().toLowerCase()),
    )
    .sort((a, b) =>
      sort.value === "name"
        ? a.name.localeCompare(b.name)
        : sort.value === "liquidity"
          ? b.liquidityValue - a.liquidityValue
          : b.score - a.score,
    ),
);
const activeNav = ref("signals");
function selectView(onlySaved) {
  savedOnly.value = onlySaved;
  query.value = "";
  category.value = "All signals";
  activeNav.value = onlySaved ? "saved" : "signals";
  location.hash = activeNav.value;
  document.getElementById("signals")?.scrollIntoView();
}
function resetFilters() {
  selectView(false);
}
function syncNavigation() {
  const target = location.hash.slice(1);
  if (["signals", "saved", "method", "builders"].includes(target))
    activeNav.value = target;
  if (target === "saved" || target === "signals")
    savedOnly.value = target === "saved";
  if (target === "saved")
    nextTick(() => document.getElementById("signals")?.scrollIntoView());
}
function toggleSaved(project) {
  const trigger = document.activeElement;
  const previous = [...saved.value];
  const exists = saved.value.includes(project.id);
  saved.value = exists
    ? saved.value.filter((id) => id !== project.id)
    : [...saved.value, project.id];
  try {
    writeSavedProjects(saved.value);
  } catch {
    storageAvailable.value = false;
  }
  notify(
    `${project.name} ${exists ? "removed from" : "added to"} your saved signals.${storageAvailable.value ? "" : " Browser storage is unavailable; saved for this session."}`,
  );
  undoAction.value = { saved: previous, projectId: project.id };
  nextTick(() => {
    if (!trigger?.isConnected)
      document.querySelector(".pb-toast .pb-undo")?.focus();
  });
}
async function undoSaved() {
  if (!undoAction.value) return;
  const projectId = undoAction.value.projectId;
  saved.value = undoAction.value.saved;
  try {
    writeSavedProjects(saved.value);
  } catch {
    storageAvailable.value = false;
  }
  notify(
    `Save action undone.${storageAvailable.value ? "" : " Changes last for this session."}`,
  );
  await nextTick();
  const target = detailDialog.value?.open
    ? detailDialog.value.querySelector(".pb-dialog-foot .pb-action--solid")
    : [...document.querySelectorAll(".pb-row")]
        .find((row) => row.dataset.projectId === projectId)
        ?.querySelector(".pb-mark");
  (target || searchInput.value)?.focus();
}
function handleShortcut(event) {
  if (
    event.key !== "/" ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) ||
    event.target.isContentEditable ||
    document.querySelector("dialog[open]")
  )
    return;
  event.preventDefault();
  searchInput.value?.focus();
}
const detailDialog = ref(null);
const submitDialog = ref(null);
const selectedProject = ref(null);
const slug = ref("");
const uri = ref("");
const formError = ref("");
let returnFocus;
async function openDetails(project) {
  returnFocus = document.activeElement;
  selectedProject.value = project;
  await nextTick();
  detailDialog.value.showModal();
}
async function openSubmit() {
  returnFocus = document.activeElement;
  formError.value = "";
  if (!submitting.value)
    transaction.value = { phase: "idle", hash: "", error: "" };
  await nextTick();
  submitDialog.value.showModal();
}
function restoreFocus() {
  if (returnFocus?.isConnected) returnFocus.focus();
  else searchInput.value?.focus();
}
async function sendPulse() {
  if (submitting.value) return;
  formError.value = "";
  if (!slug.value.trim()) {
    formError.value = "Enter a project slug to continue.";
    await nextTick();
    document.getElementById("project-slug")?.focus();
    return;
  }
  if (
    uri.value.trim() &&
    !/^(ipfs:\/\/|ar:\/\/|https?:\/\/)\S+$/i.test(uri.value.trim())
  ) {
    formError.value =
      "Use an IPFS, Arweave, or HTTP(S) metadata link, or leave it blank.";
    await nextTick();
    document.getElementById("project-uri")?.focus();
    return;
  }
  const success = await submitPulse(slug.value.trim(), uri.value.trim());
  if (success) {
    slug.value = "";
    uri.value = "";
  }
}
async function recheckSubmission() {
  if (await checkConfirmation()) {
    slug.value = "";
    uri.value = "";
  }
}
async function copyAddress() {
  try {
    await navigator.clipboard.writeText(registryAddress);
    notify("Registry program copied.");
  } catch {
    notify(
      "Copy is unavailable. Select the address below to copy it manually.",
    );
  }
}
function downloadMethod() {
  const text = `Probiuna — Follow the source. Test the claim.\n\nProposed signal methodology / v0.1\n\n${dimensions.map((d) => `${d.name}: ${d.weight}%\n${d.description}\n${d.detail}`).join("\n\n")}\n\nThe discovery board contains three fictional sample projects. Scores, liquidity, holder counts, and evidence notes are illustrative, not live or independently verified. This methodology is a published proposal, not an implemented production index. No token is issued by this interface. Registry submissions are recorded on Robinhood Chain Testnet and do not establish identity or verify a claim.\n`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  link.download = "probiuna-methodology.txt";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  notify("Methodology downloaded.");
}
onMounted(() => {
  try {
    saved.value = readSavedProjects(projects, () => {
      storageAvailable.value = false;
    });
  } catch {
    storageAvailable.value = false;
  }
  loadRegistry();
  syncNavigation();
  window.addEventListener("hashchange", syncNavigation);
  window.addEventListener("keydown", handleShortcut);
  if (location.hash)
    nextTick(() =>
      document.getElementById(location.hash.slice(1))?.scrollIntoView(),
    );
});
onUnmounted(() => {
  clearTimeout(toastTimer);
  window.removeEventListener("hashchange", syncNavigation);
  window.removeEventListener("keydown", handleShortcut);
});
</script>

<template>
  <a class="pb-skip" href="#main">Skip to content</a>
  <div id="top" class="pb-shell">
    <nav class="pb-rail" aria-label="Main navigation">
      <a class="pb-rail-brand" href="#top" aria-label="Probiuna home">
        <img src="/probiuna-logo.svg" alt="" width="42" height="42" />
      </a>
      <ul class="pb-rail-links">
        <li>
          <a
            href="#signals"
            class="pb-rail-link"
            :class="{ 'is-live': activeNav === 'signals' }"
            :aria-current="activeNav === 'signals' ? 'page' : undefined"
            @click.prevent="selectView(false)"
          >
            <Icon name="compass" />
            <span class="pb-rail-label">Research <span>01</span></span>
          </a>
        </li>
        <li>
          <a
            href="#saved"
            class="pb-rail-link"
            :class="{ 'is-live': activeNav === 'saved' }"
            :aria-current="activeNav === 'saved' ? 'page' : undefined"
            @click.prevent="selectView(true)"
          >
            <Icon name="bookmark" />
            <span class="pb-rail-label"
              >Saved signals <span>{{ saved.length }}</span></span
            >
          </a>
        </li>
        <li>
          <a
            href="#method"
            class="pb-rail-link"
            :class="{ 'is-live': activeNav === 'method' }"
            :aria-current="activeNav === 'method' ? 'page' : undefined"
            @click="activeNav = 'method'"
          >
            <Icon name="fingerprint" />
            <span class="pb-rail-label">The methodology <span>02</span></span>
          </a>
        </li>
        <li>
          <a
            href="#builders"
            class="pb-rail-link"
            :class="{ 'is-live': activeNav === 'builders' }"
            :aria-current="activeNav === 'builders' ? 'page' : undefined"
            @click="activeNav = 'builders'"
          >
            <Icon name="layers" />
            <span class="pb-rail-label">For builders <Icon name="arrow" /></span>
          </a>
        </li>
      </ul>
      <span class="pb-rail-stamp">TESTNET <span>/</span> {{ chainId }}</span>
    </nav>
    <div class="pb-frame">
      <header class="pb-command">
        <p class="pb-wordmark"
          >Probiuna<span class="pb-wordmark-sub"
            >INDEPENDENT PROJECT RESEARCH</span
          ></p
        >
        <label class="pb-find"
          ><Icon name="search" /><span class="pb-sr screen-reader-only">Search projects</span
          ><input
            ref="searchInput"
            v-model="query"
            type="search"
            placeholder="Search project, ticker, or idea"
            @keydown.esc="query = ''"
          /><kbd aria-hidden="true">/</kbd></label
        >
        <p class="pb-chain">
          Robinhood Chain<br /><span>{{ network }} · {{ chainId }}</span>
        </p>
        <button
          class="pb-wallet"
          :disabled="connecting || submitting"
          @click="connectWallet"
        >
          <Icon name="wallet" /><span>{{
            connecting
              ? "Connecting..."
              : wallet.address
                ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
                : "Connect wallet"
          }}</span>
          <span class="pb-led" :class="{ 'is-on': wallet.address }"></span>
        </button>
      </header>
      <div class="pb-scroll">
      <main id="main" class="pb-main" tabindex="-1">
        <section class="pb-lede" aria-labelledby="hero-title">
          <p class="pb-kicker">
            <span class="pb-pulse"></span> INDEPENDENT RESEARCH / TESTNET DATA
          </p>
          <h1 id="hero-title">Project research</h1>
          <p class="pb-lede-text">
            Compare illustrative signals and inspect public registry entries on Robinhood Chain Testnet.
          </p>
          <div class="pb-lede-actions">
            <a
              class="pb-action pb-action--solid"
              href="#signals"
              @click.prevent="selectView(false)"
              >Browse sample projects <Icon name="arrow"
            /></a>
            <a
              class="pb-action pb-action--ghost"
              href="#method"
              @click="activeNav = 'method'"
              >Research methodology <Icon name="arrow"
            /></a>
          </div>
          <p class="pb-footnote">
            Sample metrics are fictional and separate from on-chain records.
          </p>
          <div class="pb-instruments" aria-label="Network and registry status">
            <div>
              <span>NETWORK</span>
              <strong>{{ network }}</strong>
              <small>Chain ID {{ chainId }}</small>
            </div>
            <div>
              <span>REGISTRY ENTRIES</span>
              <strong>{{ registryState === "ready" ? registryCount : "—" }}</strong>
              <small>{{ registryState === "ready" ? "Public submissions" : "Read-only status" }}</small>
            </div>
            <a href="#builders" @click="activeNav = 'builders'">Registry details <Icon name="arrow" /></a>
          </div>
        </section>
        <section
          id="signals"
          class="pb-stage"
          aria-labelledby="signals-title"
        >
          <div class="pb-gutter">
            <p class="pb-kicker">DISCOVERY INDEX</p>
            <h2 id="signals-title">
              {{ savedOnly ? "Saved projects" : "Project signals"
              }}<span class="pb-heading-count">{{
                filteredProjects.length
              }}</span>
            </h2>
            <span class="pb-sample"
              ><span class="pb-sample-dot"></span> FICTIONAL SAMPLE COLLECTION</span
            >
            <div class="pb-readout">
              <span aria-live="polite"
                >{{ filteredProjects.length }} of {{ projects.length }} sample
                projects</span
              ><span
                ><Icon name="info" /> Illustrative data · not a live market
                feed</span
              >
            </div>
            <div v-if="!storageAvailable" class="pb-storage" role="status">
              <Icon name="info" />Browser storage is unavailable. Your saved
              signals will last for this session.
            </div>
          </div>
          <div class="pb-data">
            <div class="pb-toolbar">
              <label class="pb-sort"
                ><Icon name="sort" /><span class="pb-sr screen-reader-only">Sort projects</span
                ><select v-model="sort">
                  <option value="score">Highest score</option>
                  <option value="liquidity">Liquidity</option>
                  <option value="name">Name A-Z</option>
                </select></label
              >
              <div class="pb-views" aria-label="Project view">
                <button
                  aria-label="List view"
                  :aria-pressed="layout === 'rows'"
                  :class="{ 'is-picked': layout === 'rows' }"
                  @click="layout = 'rows'"
                >
                  <Icon name="list" /></button
                ><button
                  aria-label="Card view"
                  :aria-pressed="layout === 'cards'"
                  :class="{ 'is-picked': layout === 'cards' }"
                  @click="layout = 'cards'"
                >
                  <Icon name="grid" />
                </button>
              </div>
            </div>
            <div class="pb-filters" aria-label="Filter by signal">
              <span class="pb-filter-label"><Icon name="sliders" /> SIGNAL</span
              ><button
                v-for="item in categories"
                :key="item"
                :class="{ 'is-picked': category === item }"
                :aria-pressed="category === item"
                :aria-label="item"
                @click="category = item"
              >
                {{ item
                }}<span v-if="item === 'All signals'">{{
                  projects.length
                }}</span>
              </button>
            </div>
            <div v-if="activeFilterCount" class="pb-active">
              <span
                >{{ activeFilterCount }}
                {{ activeFilterCount === 1 ? "filter" : "filters" }}
                active</span
              ><button
                v-if="query.trim()"
                @click="query = ''"
                :aria-label="`Remove search filter ${query}`"
              >
                “{{ query }}”<Icon name="close" /></button
              ><button
                v-if="category !== 'All signals'"
                @click="category = 'All signals'"
                :aria-label="`Remove ${category} filter`"
              >
                {{ category }}<Icon name="close" /></button
              ><button class="pb-clear" @click="clearFilters">
                Clear filters
              </button>
            </div>
            <div
              v-if="filteredProjects.length"
              class="pb-ledger"
              :class="`is-${layout}`"
            >
              <div
                v-if="layout === 'rows'"
                class="pb-ledger-head"
                aria-hidden="true"
              >
                <span>PROJECT / SIGNAL</span><span>SAMPLE SCORE</span
                ><span>HOLDERS</span><span>LIQUIDITY</span><span>7D CHANGE</span
                ><span></span>
              </div>
              <article
                v-for="(project, index) in filteredProjects"
                :key="project.id"
                :data-project-id="project.id"
                class="pb-row"
              >
                <div
                  class="pb-cover"
                  :class="project.color"
                  aria-hidden="true"
                >
                  <span class="pb-cover-ref"
                    >FIELD NOTES / 0{{ index + 1 }}</span
                  >
                  <span class="pb-cover-ring"></span><Icon :name="project.icon" />
                  <span class="pb-cover-tag">{{ project.tag }}</span>
                </div>
                <div class="pb-ident">
                  <span class="pb-ident-mark" :class="project.color"
                    ><Icon :name="project.icon"
                  /></span>
                  <div class="pb-ident-text">
                    <span class="pb-ident-index">{{
                      String(index + 1).padStart(2, "0")
                    }}</span>
                    <h3>
                      <button
                        :aria-label="`Open ${project.name} evidence`"
                        @click="openDetails(project)"
                      >
                        {{ project.name }}
                      </button>
                    </h3>
                    <span class="pb-ident-ticker">{{ project.ticker }}</span
                    ><span class="pb-ident-tag">{{ project.tag }}</span>
                  </div>
                </div>
                <p class="pb-blurb">{{ project.blurb }}</p>
                <dl class="pb-measures">
                  <div class="pb-measure pb-measure--score">
                    <dt class="pb-measure-label">SAMPLE SCORE</dt>
                    <dd class="pb-score">
                      <strong>{{ project.score }}<small>/100</small></strong
                      ><span class="pb-meter"
                        ><span :style="{ width: `${project.score}%` }"></span
                      ></span>
                    </dd>
                  </div>
                  <div class="pb-measure">
                    <dt>Holders</dt
                    ><dd><strong>{{ project.holders }}</strong></dd>
                  </div>
                  <div class="pb-measure">
                    <dt>Liquidity</dt
                    ><dd><strong>{{ project.liquidity }}</strong></dd>
                  </div>
                  <div class="pb-measure pb-measure--change">
                    <dt>7D change</dt
                    ><dd>
                      <strong class="pb-up">{{ project.delta }}</strong
                      ><svg viewBox="0 0 90 30" fill="none" aria-hidden="true">
                        <path
                          :d="project.spark"
                          stroke="currentColor"
                          stroke-width="1.5"
                        />
                      </svg>
                    </dd>
                  </div>
                </dl>
                <div class="pb-row-actions">
                  <button
                    class="pb-iconbtn pb-mark"
                    :class="{ 'is-saved': saved.includes(project.id) }"
                    :aria-label="`${saved.includes(project.id) ? 'Unsave' : 'Save'} ${project.name}`"
                    :aria-pressed="saved.includes(project.id)"
                    @click="toggleSaved(project)"
                  >
                    <Icon name="bookmark" /></button
                  ><button
                    class="pb-dossier"
                    :aria-label="`Read ${project.name} evidence`"
                    @click="openDetails(project)"
                  >
                    <span>Read the dossier</span><Icon name="arrow" />
                  </button>
                </div>
              </article>
            </div>
            <div v-else class="pb-empty">
              <span class="pb-empty-mark"
                ><Icon :name="savedOnly ? 'bookmark' : 'search'"
              /></span>
              <h3>
                {{
                  savedOnly && !saved.length
                    ? "Your next good find belongs here."
                    : "No signals found."
                }}
              </h3>
              <p>
                {{
                  savedOnly && !saved.length
                    ? "Bookmark a project to create a shortlist. Your saved signals stay in this browser."
                    : "Try another search or clear your filters to see the collection."
                }}
              </p>
              <button
                v-if="activeFilterCount"
                class="pb-action pb-action--solid"
                @click="clearFilters"
              >
                Clear filters <Icon name="refresh" /></button
              ><button v-else class="pb-action pb-action--solid" @click="resetFilters">
                Explore all projects <Icon name="arrow" />
              </button>
            </div>
          </div>
        </section>
        <section
          id="method"
          class="pb-method"
          aria-labelledby="method-title"
        >
          <div class="pb-method-copy">
            <p class="pb-kicker">THE RESEARCH LENS</p>
            <h2 id="method-title">
              Trace the source.<br /><em>Test the claim.</em>
            </h2>
            <p>
              Five dimensions, one research framework. Inspect the inputs before
              you decide what the number means.
            </p>
            <div class="pb-spectrum" aria-hidden="true">
              <span
                v-for="dimension in dimensions"
                :key="dimension.name"
                :style="{ flex: dimension.weight }"
              ></span>
            </div>
            <div class="pb-spectrum-cap">
              <span>PROPOSED WEIGHTING</span><span>100%</span>
            </div>
            <button class="pb-action pb-action--ghost" @click="downloadMethod">
              Download the methodology <Icon name="download" /></button
            ><span class="pb-model"
              >PROPOSED MODEL / V0.1<br />Illustrative scores. Not a production
              index.</span
            >
          </div>
          <ol class="pb-channels">
            <li v-for="(dimension, index) in dimensions" :key="dimension.name">
              <details>
                <summary>
                  <span class="pb-ch-index">0{{ index + 1 }}</span>
                  <div>
                    <h3>{{ dimension.name }}</h3>
                    <p>{{ dimension.description }}</p>
                  </div>
                  <strong>{{ dimension.weight }}<small>%</small></strong
                  ><Icon name="plus" />
                </summary>
                <div class="pb-ch-detail">
                  <span class="pb-ch-label">FOLLOW THE INPUTS</span>
                  <p>{{ dimension.detail }}</p>
                </div>
              </details>
            </li>
          </ol>
        </section>
        <section
          id="builders"
          class="pb-builders"
          aria-labelledby="builders-title"
        >
          <div class="pb-invite">
            <p class="pb-kicker">AN OPEN INVITATION</p>
            <h2 id="builders-title">
              Building something?<br /><em>Leave a clear record.</em>
            </h2>
            <p>
              Give your project a public starting point. Register a slug and an
              evidence link on {{ network }}.
            </p>
            <button class="pb-action pb-action--solid" @click="openSubmit">
              {{
                transaction.phase === "pending"
                  ? "Check pending submission"
                  : "Submit a project"
              }}<Icon name="plus" /></button
            ><small
              ><Icon name="wallet" />An EVM wallet on Robinhood Chain Testnet and ETH for gas are needed to submit.</small
            >
          </div>
          <aside class="pb-registry">
            <div class="pb-registry-head">
              <span class="pb-registry-symbol"><Icon name="layers" /></span>
              <div>
                <h3>Probiuna Registry</h3>
                <span>{{ network }}</span>
              </div>
              <span class="pb-pill">TESTNET</span>
            </div>
            <div class="pb-registry-state" aria-live="polite">
              <span
                :class="['pb-dot', { 'is-off': registryState === 'error' }]"
              />{{
                registryState === "loading"
                  ? `Reading the ${network} registry...`
                  : registryState === "ready"
                    ? `${registryCount} project ${registryCount === 1 ? "entry" : "entries"} registered`
                    : registryState === "unconfigured"
                      ? "Registry contract is not configured"
                      : "The registry could not be reached"
              }}<button
                v-if="registryState === 'error'"
                class="pb-action pb-action--ghost"
                @click="loadRegistry"
              >
                Retry <Icon name="refresh" />
              </button>
            </div>
            <div v-if="registryEntries.length" class="pb-registry-rows">
              <ul>
                <li v-for="entry in registryEntries" :key="entry.id">
                  <span>#{{ entry.id }}</span
                  ><strong>{{ entry.slug || `Entry ${entry.id}` }}</strong
                  ><small>{{ entry.active ? "Active" : "Inactive" }}</small>
                </li>
              </ul>
              <p>
                Latest {{ registryEntries.length }} on-chain entries · separate
                from the sample collection.
              </p>
            </div>
            <p v-else class="pb-registry-empty">
              {{
                registryState === "ready"
                  ? "The registry is ready for its first project. Add a public record of your work."
                  : registryState === "loading"
                    ? "Loading public entries. You can keep exploring the sample collection."
                    : registryState === "unconfigured"
                      ? "Browsing is available. Registry submissions need a configured contract address."
                      : "The sample collection remains available while the registry is offline."
              }}
            </p>
            <div class="pb-registry-address">
              <span>REGISTRY CONTRACT</span><code>{{ registryAddress }}</code>
              <div>
                <button
                  class="pb-action pb-action--ghost"
                  :disabled="!registryReady"
                  @click="copyAddress"
                >
                  Copy address <Icon name="copy" /></button
                ><a
                  v-if="registryReady"
                  :href="explorerUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  >View on explorer <Icon name="arrow"
                /></a>
              </div>
            </div>
          </aside>
        </section>
        <figure class="pb-attic" hidden>
          <div class="pb-attic-top">
            <span>THE ANATOMY OF A SIGNAL</span><span>FIG. 01</span>
          </div>
          <svg
            class="pb-attic-art"
            viewBox="0 0 520 400"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="paper-lines"
                width="12"
                height="12"
                patternUnits="userSpaceOnUse"
              >
                <path d="M0 12 12 0" stroke="#172821" opacity=".055" />
              </pattern>
            </defs>
            <circle cx="265" cy="204" r="163" fill="url(#paper-lines)" />
            <path
              d="M18 317H501M263 24V371"
              stroke="#172821"
              opacity=".16"
              stroke-dasharray="3 6"
            />
            <g transform="rotate(-13 245 198)">
              <rect
                x="97"
                y="81"
                width="257"
                height="269"
                fill="#d3d8c7"
                stroke="#172821"
                stroke-width="1.2"
              />
              <path
                d="M117 109h84M117 119h41"
                stroke="#172821"
                opacity=".6"
              />
            </g>
            <g transform="rotate(9 280 195)">
              <rect
                x="163"
                y="57"
                width="257"
                height="285"
                fill="#f9f7f0"
                stroke="#172821"
                stroke-width="1.2"
              />
              <path
                d="M182 90h157M182 106h85"
                stroke="#172821"
                opacity=".5"
              />
              <path
                d="M183 270h202M183 283h202M183 296h113"
                stroke="#172821"
                opacity=".22"
              />
              <circle
                cx="280"
                cy="183"
                r="64"
                stroke="#172821"
                stroke-width=".8"
              />
              <circle
                cx="280"
                cy="183"
                r="44"
                stroke="#172821"
                stroke-width=".8"
              />
              <path
                d="M209 183h143M280 112v142"
                stroke="#172821"
                opacity=".4"
              />
              <circle cx="280" cy="183" r="11" fill="#bc452a" />
            </g>
            <rect
              x="46"
              y="225"
              width="189"
              height="94"
              fill="#bc452a"
              transform="rotate(-5 46 225)"
            />
            <path
              d="m69 257 9 9 16-22M104 252h95M69 284h113"
              stroke="#fff9ef"
              stroke-width="2"
            />
            <circle cx="409" cy="110" r="31" fill="#172821" />
            <path
              d="M409 93v34M392 110h34m-29-12 24 24m-24 0 24-24"
              stroke="#f4f1e9"
              stroke-width="2"
            />
            <path d="M386 328h65m-10-9 10 9-10 9" stroke="#172821" />
            <circle cx="92" cy="89" r="3" fill="#bc452a" />
          </svg>
          <figcaption>
            <span
              >Look closer.<br /><strong
                >Context changes the picture.</strong
              ></span
            ><a
              href="#method"
              @click="activeNav = 'method'"
              aria-label="Read the methodology"
              ><Icon name="arrow"
            /></a>
          </figcaption>
        </figure>
        <div class="pb-attic" hidden aria-label="How to use the index">
          <a href="#signals" @click.prevent="selectView(false)"
            ><span>01</span>
            <div>
              <strong>Find a starting point</strong
              ><small
                >Explore {{ projects.length }} sample project dossiers</small
              >
            </div>
            <Icon name="arrow"
          /></a>
          <a href="#method" @click="activeNav = 'method'"
            ><span>02</span>
            <div>
              <strong>Question the inputs</strong
              ><small>Read the five research dimensions</small>
            </div>
            <Icon name="arrow"
          /></a>
          <a href="#saved" @click.prevent="selectView(true)"
            ><span>03</span>
            <div>
              <strong>Keep a closer look</strong
              ><small>{{ saved.length }} saved in your browser</small>
            </div>
            <Icon name="arrow"
          /></a>
        </div>
      </main>
      <footer class="pb-status">
          <div class="pb-status-brand">
            probiuna<span>Follow the source. Test the claim.</span>
          </div>
          <p>
            Independent project research.<br />Testnet only. Sample data is not
            investment advice.
          </p>
          <div class="pb-status-links">
            <a
              href="https://x.com/probiuna"
              target="_blank"
              rel="noopener noreferrer"
              >X / @probiuna <Icon name="arrow" /></a
            ><a
              href="https://probiuna.xyz"
              target="_blank"
              rel="noopener noreferrer"
              >probiuna.xyz <Icon name="arrow"
            /></a>
          </div>
          <a href="#top" class="pb-backtop" aria-label="Back to top"
            ><Icon name="arrow-up"
          /></a>
        </footer>
      </div>
    </div>
  </div>
  <dialog
    ref="detailDialog"
    class="pb-dialog"
    aria-labelledby="detail-title"
    @close="restoreFocus"
    @click="
      (event) => {
        if (event.target === detailDialog) detailDialog.close();
      }
    "
  >
    <template v-if="selectedProject"
      ><div class="pb-dialog-head">
        <p class="pb-kicker">PROJECT DOSSIER / SAMPLE</p>
        <button
          class="pb-iconbtn"
          aria-label="Close evidence"
          @click="detailDialog.close()"
        >
          <Icon name="close" />
        </button>
      </div>
      <div class="pb-detail-project">
        <span class="pb-ident-mark" :class="selectedProject.color"
          ><Icon :name="selectedProject.icon"
        /></span>
        <div>
          <h2 id="detail-title">{{ selectedProject.name }}</h2>
          <span>{{ selectedProject.ticker }} · {{ selectedProject.tag }}</span>
        </div>
        <strong>{{ selectedProject.score }}<small>/100</small></strong>
      </div>
      <p class="pb-detail-blurb">{{ selectedProject.blurb }}</p>
      <div class="pb-sample-notice">
        <Icon name="info" />
        <p>
          This is a fictional sample project. All scores, metrics, and notes
          below demonstrate the discovery experience; they are not verified
          evidence.
        </p>
      </div>
      <div class="pb-detail-metrics">
        <div>
          <small>7D SIGNAL CHANGE</small
          ><strong>{{ selectedProject.delta }}</strong>
        </div>
        <div>
          <small>HOLDERS</small><strong>{{ selectedProject.holders }}</strong>
        </div>
        <div>
          <small>LIQUIDITY</small
          ><strong>{{ selectedProject.liquidity }}</strong>
        </div>
      </div>
      <h3 class="pb-detail-subtitle">What to look into</h3>
      <ol class="pb-notes">
        <li v-for="note in selectedProject.evidence" :key="note.title">
          <Icon name="check" />
          <div>
            <h4>{{ note.title }}</h4>
            <p>{{ note.text }}</p>
          </div>
        </li>
      </ol>
      <div class="pb-dialog-foot">
        <a
          class="pb-action pb-action--ghost"
          href="#method"
          @click="
            detailDialog.close();
            activeNav = 'method';
          "
          >Understand the score <Icon name="arrow" /></a
        ><button
          v-if="undoAction?.projectId === selectedProject.id"
          class="pb-action pb-action--ghost"
          @click="undoSaved"
        >
          Undo</button
        ><button class="pb-action pb-action--solid" @click="toggleSaved(selectedProject)">
          <Icon name="bookmark" />{{
            saved.includes(selectedProject.id)
              ? "Remove from saved"
              : "Save signal"
          }}
        </button>
      </div></template
    >
  </dialog>
  <dialog
    ref="submitDialog"
    class="pb-dialog pb-dialog--submit"
    aria-labelledby="submit-title"
    @close="restoreFocus"
  >
    <div class="pb-dialog-head">
      <p class="pb-kicker">NEW REGISTRY ENTRY</p>
      <button
        class="pb-iconbtn"
        aria-label="Close submission"
        @click="submitDialog.close()"
      >
        <Icon name="close" />
      </button>
    </div>
    <template v-if="transaction.phase === 'success'"
      ><div class="pb-success">
        <span><Icon name="check" /></span>
        <h2 id="submit-title">Your project is on the record.</h2>
        <p>
          Your project entry was confirmed on {{ network }}. It is
          stored in the registry; it does not automatically join the curated
          sample collection.
        </p>
        <a
          class="pb-action pb-action--solid"
          :href="explorerTransactionUrl(transaction.hash)"
          target="_blank"
          rel="noopener noreferrer"
          >View transaction <Icon name="arrow" /></a
        ><button class="pb-action pb-action--ghost" @click="submitDialog.close()">
          Back to discovery
        </button>
      </div></template
    ><template v-else
      ><h2 id="submit-title">Add a public<br />registry entry.</h2>
      <p class="pb-dialog-text">
        Publish your project slug and an optional metadata link. The entry is
        public, and each slug can only be registered once.
      </p>
      <div class="pb-steps" aria-label="Submission progress">
        <span
          :class="{
            'is-now':
              transaction.phase === 'idle' || transaction.phase === 'error',
          }"
          >01 Details</span
        ><span :class="{ 'is-now': transaction.phase === 'signature' }"
          >02 Wallet approval</span
        ><span
          :class="{
            'is-now': ['confirming', 'pending'].includes(transaction.phase),
          }"
          >03 Confirmation</span
        >
      </div>
      <form @submit.prevent="sendPulse" novalidate>
        <label class="pb-field-label" for="project-slug"
          >Project slug <span>Required</span></label
        ><input
          id="project-slug"
          v-model="slug"
          :disabled="submitting"
          placeholder="your-project"
          autocomplete="off"
          aria-describedby="slug-hint form-error"
          :aria-invalid="!!formError && !slug.trim()"
        /><small id="slug-hint" class="pb-hint"
          >Use a short, recognizable name. Slugs are case-sensitive.</small
        ><label class="pb-field-label" for="project-uri"
          >Metadata link <span>Optional</span></label
        ><input
          id="project-uri"
          v-model="uri"
          :disabled="submitting"
          placeholder="ipfs://… or https://…"
          aria-describedby="uri-hint form-error"
          :aria-invalid="
            !!formError &&
            !!uri.trim() &&
            !/^(ipfs:\/\/|ar:\/\/|https?:\/\/)\S+$/i.test(uri.trim())
          "
        /><small id="uri-hint" class="pb-hint"
          >Link to public project metadata. Probiuna does not upload or pin
          files.</small
        >
        <p
          v-if="formError || transaction.error"
          id="form-error"
          class="pb-error"
          role="alert"
        >
          {{ formError || transaction.error }}
        </p>
        <p v-if="!registryReady" class="pb-error">
          A Robinhood Chain Testnet registry contract must be configured before submitting.
        </p>
        <p
          v-if="submitting && transaction.phase !== 'pending'"
          class="pb-progress"
          role="status"
        >
          <span class="pb-spinner"></span
          >{{
            transaction.phase === "signature"
              ? "Review the request in your wallet…"
              : "Transaction sent. Waiting for confirmation…"
          }}
        </p>
        <a
          v-if="transaction.hash"
          class="pb-action pb-action--ghost pb-tx"
          :href="explorerTransactionUrl(transaction.hash)"
          target="_blank"
          rel="noopener noreferrer"
          >Track transaction <Icon name="arrow" /></a
        ><button
          v-if="transaction.phase === 'pending'"
          type="button"
          class="pb-action pb-action--ghost pb-full"
          @click="recheckSubmission"
        >
          Recheck confirmation <Icon name="refresh" /></button
        ><button
          type="submit"
          class="pb-action pb-action--solid pb-full"
          :disabled="submitting || connecting || !registryReady"
        >
          {{
            submitting
              ? "Submission in progress…"
              : wallet.address
                ? "Submit to testnet registry"
                : "Connect wallet & submit"
          }}<Icon v-if="!submitting" name="arrow" />
        </button>
        <p class="pb-disclosure">
          {{ network }} only · Requires testnet ETH for gas.<br />This experimental
          contract has not been externally audited.
        </p>
      </form></template
    >
  </dialog>
  <div class="pb-toastzone" aria-live="polite" aria-atomic="true">
    <Transition name="toast"
      ><div v-if="toast" class="pb-toast">
        <Icon name="info" /><span>{{ toast }}</span
        ><button v-if="undoAction" class="pb-undo" @click="undoSaved">
          Undo</button
        ><button aria-label="Dismiss notification" @click="toast = ''">
          <Icon name="close" />
        </button></div
    ></Transition>
  </div>
</template>
