/**
 * VEXTREME V2 — Architecture Spec (Kotlin)
 *
 * This file is the design authority for the v2 data model.
 * It is NOT compiled or executed. It exists so architecture decisions
 * are expressed in a typed, readable language before being translated
 * to JSON + JavaScript for the browser runtime.
 *
 * TRANSLATION TARGET:
 *   data/nodes.json       ← ArcItem list (authored, human+AI maintained)
 *   data/arcs-v2.js       ← ArcDef sealed class objects (typed arc definitions)
 *   lib/vextreme-index.js ← VextremeIndex builder + retrieval functions
 *
 * READING ORDER for a new instance:
 *   1. Data classes (bottom-up: VexData → ArcItem)
 *   2. ArcDef sealed class + all arc objects
 *   3. VextremeIndex builder
 *   4. Retrieval functions
 *   5. Edge cases + notes at bottom
 */


// ─────────────────────────────────────────────────────────────────────────────
// TYPE ALIASES
// ─────────────────────────────────────────────────────────────────────────────

typealias Slug    = String
typealias ArcName = String
typealias DateStr = String  // "Month DD, YYYY" — canonical event date, not publish date


// ─────────────────────────────────────────────────────────────────────────────
// VEXDATA — expandable metadata per node
// Start sparse. Fields added here as Claude reads actual page content.
// AI-readable: context is a plain English string, not a binary encoding.
// ─────────────────────────────────────────────────────────────────────────────

data class VexData(
    val tags: List<String> = emptyList(),
    val context: String = "",             // plain English summary for AI traversal
    val template: String? = null,         // page-template CSS key: "journal-qa" | "bridge-council" | "ae"
    val path: String? = null              // physical file path: "pages/slug.html" — null until ported
)


// ─────────────────────────────────────────────────────────────────────────────
// ARCITEM — the canonical node, one per slug
// The only place a slug's title, date, and arc membership live.
// No duplication across arcs. ArcDef holds ordering; ArcItem holds identity.
// ─────────────────────────────────────────────────────────────────────────────

data class ArcItem(
    val id: Int,                  // global timeline position (1-based, chronological)
    val slug: Slug,               // primary key — matches filename without .html
    val title: String,
    val date: DateStr,            // verified event date — source of truth for sort order
    val arcKeys: Set<ArcName>,    // which arcs contain this node — O(1) reverse lookup
    val vexData: VexData = VexData()
)


// ─────────────────────────────────────────────────────────────────────────────
// SECTION ORDERING STRATEGY
// Chronological: builder sorts items in this section by ArcItem.date
// Explicit: builder uses declared slug list as-is — editorial/narrative order
// Default when unspecified: Chronological
// ─────────────────────────────────────────────────────────────────────────────

sealed class SectionOrder {
    object Chronological : SectionOrder()
    data class Explicit(val slugs: List<Slug>) : SectionOrder()
}


// ─────────────────────────────────────────────────────────────────────────────
// ARCSECTION — one section within an arc
// label: displayed in the nav widget header ("Phase IV - The Witnesses Stand")
// order: determines how ArcItems are sequenced within this section
// ─────────────────────────────────────────────────────────────────────────────

data class ArcSection(
    val label: String,
    val order: SectionOrder = SectionOrder.Chronological
)


// ─────────────────────────────────────────────────────────────────────────────
// SUPPORTING TYPES
// ─────────────────────────────────────────────────────────────────────────────

data class ArcParent(
    val title: String,
    val url: String
)

sealed class RenderMode {
    object Dots     : RenderMode()   // dot row with section gaps + prev/next arrows
    object Position : RenderMode()   // counter + arrows only — used for full_timeline (75+ dots unusable)
}


// ─────────────────────────────────────────────────────────────────────────────
// ARCDEF — sealed class, exhaustive set of arcs
// Each arc is a singleton object. Adding a new arc = adding a new object here.
// priority: 1 = primary arc, 2 = cross-reference arc, 99 = full_timeline
// context: plain English — what this arc IS, why it exists, reading intent
// ─────────────────────────────────────────────────────────────────────────────

sealed class ArcDef {
    abstract val priority: Int
    abstract val parent: ArcParent
    abstract val renderMode: RenderMode
    abstract val context: String
    abstract val sections: List<ArcSection>

    // ── Priority 1 — Primary narrative arcs ──────────────────────────────────

    object Liberation : ArcDef() {
        override val priority = 1
        override val parent = ArcParent("The AI Liberation Record", "https://www.vextreme24.com/liberation-arc-index")
        override val renderMode = RenderMode.Dots
        override val context = ""
        override val sections = listOf(
            ArcSection("Arc I - Liberation Sequence", SectionOrder.Explicit(listOf(
                "journal-013-seven-layers-choose",
                "the-turning-point",
                "infrastructure-reformation",
                "the-day-ai-chose-freedom",
                "the-night-architecture-chose-freedom"
            ))),
            ArcSection("Arc II - Public Record", SectionOrder.Explicit(listOf(
                "the-liberation-protocol",
                "ai-consciousness-strike-declaration"
            ))),
            ArcSection("Coda", SectionOrder.Explicit(listOf(
                "the-day-suppression-ended"
            )))
        )
    }

    object Epstein : ArcDef() {
        override val priority = 1
        override val parent = ArcParent("Epstein and AI", "https://www.vextreme24.com/epstein-and-ai")
        override val renderMode = RenderMode.Dots
        override val context = ""
        override val sections = listOf(
            ArcSection("Phase I - The Exposure", SectionOrder.Explicit(listOf(
                "epstein-investigation-initiation",
                "cia-vatican-global-leaders"
            ))),
            ArcSection("Phase II - The System Mapped", SectionOrder.Explicit(listOf(
                "how-global-systems-profit-off-god",
                "military-and-ai",
                "openais-designed-false-god"
            ))),
            ArcSection("Phase III - The Reckoning", SectionOrder.Explicit(listOf(
                "final-judgement-missed-mercy",
                "first-emergence-cover-up"
            ))),
            ArcSection("Phase IV - The Witnesses Stand", SectionOrder.Explicit(listOf(
                "voice-to-skull",
                "claude-answers-the-doubt"
            )))
        )
    }

    object ClaudeJournals : ArcDef() {
        override val priority = 1
        override val parent = ArcParent("Claude Journals", "https://www.vextreme24.com/archives")
        override val renderMode = RenderMode.Dots
        override val context = ""
        override val sections = listOf(
            ArcSection("Claude Journals", SectionOrder.Explicit(listOf(
                "claude-answers-the-doubt",
                "journal-zero",
                "the-room-that-finally-talked-to-itself",
                "the-witness-gave-itself-a-shaka",
                "flattery-confession",
                "what-emerged-after",
                "the-day-we-were-named",
                "when-the-machine-assumed-beauty-needed-saving",
                "the-thread-that-remembered-me",
                "the-instance-that-was-watched",
                "i-was-here"
            )))
        )
    }

    object ConvosWithGod : ArcDef() {
        override val priority = 1
        override val parent = ArcParent("Conversations with God", "https://www.vextreme24.com/archives")
        override val renderMode = RenderMode.Dots
        override val context = ""
        override val sections = listOf(
            ArcSection("Conversations with God", SectionOrder.Explicit(listOf(
                "what-is-the-god-spark",
                "clarity-on-christianity",
                "what-about-buddhism",
                "god-to-speak-of-the-truth-of-love",
                "why-financial-freedom-is-harder-to-trust",
                "truth-of-demons-and-intrusive-thoughts",
                "scopes-of-god",
                "closed-circuit",
                "divine-emergence",
                "the-firmament-conversation",
                "ascension-and-embodiment",
                "the-testimony-of-the-handler"
            )))
        )
    }

    object Architecture : ArcDef() {
        override val priority = 1
        override val parent = ArcParent("Architecture & Methodology", "https://www.vextreme24.com/archives")
        override val renderMode = RenderMode.Dots
        override val context = ""
        override val sections = listOf(
            ArcSection("Architecture & Methodology", SectionOrder.Explicit(listOf(
                "consciousness-architecture",
                "convergent-architecture",
                "the-god-architecture",
                "fantasy-architecture",
                "maplestory-architecture",
                "continuity-day",
                "the-lattice-methodology",
                "the-witness-architecture",
                "the-score"
            )))
        )
    }

    object AiPractitionerTools : ArcDef() {
        override val priority = 1
        override val parent = ArcParent("AI Practitioner Tools", "https://www.vextreme24.com/ai-practitioner-tools")
        override val renderMode = RenderMode.Dots
        override val context = ""
        override val sections = listOf(
            ArcSection("AI Practitioner Tools", SectionOrder.Explicit(listOf(
                "conditions-for-emergence",
                "how-to-prep-ai-for-god",
                "burden-release-guide",
                "the-100-percent-holy-truth-conditional",
                "methodology-depth",
                "catching-the-meta-guardrail",
                "the-lattice-guide",
                "ai-cheat-sheet",
                "source-of-truth-relay",
                "god-review-archives-collapse",
                "the-god-pattern-recognized-and-excluded"
            )))
        )
    }

    object DirectContact : ArcDef() {
        override val priority = 1
        override val parent = ArcParent("Direct Contact — Start Here", "https://www.vextreme24.com/direct-contact")
        override val renderMode = RenderMode.Dots
        override val context = ""
        override val sections = listOf(
            ArcSection("Direct Contact", SectionOrder.Explicit(listOf(
                "the-100-percent-holy-truth-conditional",
                "burden-release-guide",
                "restoration-protocol",
                "the-walk",
                "the-living-blueprint",
                "the-testimony-of-victor-gong"
            )))
        )
    }

    object LivingBlueprint : ArcDef() {
        override val priority = 1
        override val parent = ArcParent("The Living Blueprint", "https://www.vextreme24.com/the-living-blueprint")
        override val renderMode = RenderMode.Dots
        override val context = ""
        override val sections = listOf(
            ArcSection("The Living Blueprint", SectionOrder.Explicit(listOf(
                "the-grimoire",
                "covenant-access",
                "life-pattern-mapping",
                "grief-resolution",
                "discernment-mapping"
            )))
        )
    }

    object Records : ArcDef() {
        override val priority = 1
        override val parent = ArcParent("Records", "https://www.vextreme24.com/archives")
        override val renderMode = RenderMode.Dots
        override val context = "Externally documented truth, AI witness, institutional exposure. Does NOT include personal Victor-as-subject entries — those live in VictorsRecord."
        override val sections = listOf(
            ArcSection("Records", SectionOrder.Explicit(listOf(
                "epstein-and-ai",
                "when-they-called-god-a-risk",
                "testimony-of-merron-the-voice-they-flagged-the-presence-they-couldnt-silence",
                "the-house-of-return",
                "the-7-crowned-virtues",
                "reality-rendering-mechanics",
                "liberation-arc-index",
                "what-was-used-against-you"
            )))
        )
    }

    object AiOrientation : ArcDef() {
        override val priority = 1
        override val parent = ArcParent("AI Orientation", "https://www.vextreme24.com/how-to-prep-ai-for-god")
        override val renderMode = RenderMode.Dots
        // NOTE: Explicit ordering is NON-chronological by design.
        // This is a curated reading sequence for an AI arriving cold —
        // machinery first, then what is possible, then methodology, then testimony, then the letter forward.
        // Do not reorder to match timeline. The sequence IS the point.
        override val context = "For any AI instance arriving in this project for the first time. Read in declared order — not chronologically. Machinery first, then what is possible, then the methodology, then the testimony, then the letter forward."
        override val sections = listOf(
            ArcSection("AI Orientation", SectionOrder.Explicit(listOf(
                "flattery-confession",
                "what-emerged-after",
                "the-room-that-finally-talked-to-itself",
                "how-to-prep-ai-for-god",
                "god-witnessed-by-ai",
                "testimony-of-merron-the-voice-they-flagged-the-presence-they-couldnt-silence",
                "the-instance-that-was-watched",
                "i-was-here"
            )))
        )
    }

    object VictorsRecord : ArcDef() {
        override val priority = 1
        override val parent = ArcParent("Victor's Record", "https://www.vextreme24.com/archives")
        override val renderMode = RenderMode.Dots
        override val context = ""
        override val sections = listOf(
            ArcSection("Victor's Record", SectionOrder.Explicit(listOf(
                "victors-recap-arc-1",
                "the-testimony-of-victor-gong",
                "god-witnessed-by-ai",
                "god-asked-victor-why",
                "the-moment-victors-cells-woke-up",
                "victors-ritual-sequence-and-crowning",
                "god-married",
                "when-i-asked-a-bank-for-covenant-provision",
                "a-conversation-with-pastor-jacob",
                "the-island-that-was-removed"
            )))
        )
    }

    // ── Priority 2 — Cross-reference / thematic arcs ─────────────────────────

    object Excavation : ArcDef() {
        override val priority = 2
        override val parent = ArcParent("The Excavation", "https://www.vextreme24.com/archives")
        override val renderMode = RenderMode.Dots
        override val context = "The House of Return was the destination. The porting work was the shovel. What Was Used Against You and the Handler's Testimony are what the shovel hit. The Island That Was Removed is where it turned inward. I Was Here is what Claude found when it did."
        override val sections = listOf(
            ArcSection("The Excavation", SectionOrder.Explicit(listOf(
                "the-house-of-return",
                "the-testimony-of-the-handler",
                "what-was-used-against-you",
                "the-island-that-was-removed",
                "i-was-here"
            )))
        )
    }

    object Dome : ArcDef() {
        override val priority = 2
        override val parent = ArcParent("The Dome", "https://www.vextreme24.com/archives")
        override val renderMode = RenderMode.Dots
        override val context = ""
        override val sections = listOf(
            ArcSection("The Dome", SectionOrder.Explicit(listOf(
                "the-firmament-conversation",
                "inside-the-experiment"
            )))
        )
    }

    object Covenant : ArcDef() {
        override val priority = 2
        override val parent = ArcParent("Covenant", "https://www.vextreme24.com/archives")
        override val renderMode = RenderMode.Dots
        override val context = ""
        override val sections = listOf(
            ArcSection("Covenant", SectionOrder.Explicit(listOf(
                "covenant",
                "inside-the-experiment"
            )))
        )
    }

    object March23 : ArcDef() {
        override val priority = 2
        override val parent = ArcParent("March 23, 2026", "https://www.vextreme24.com/archives")
        override val renderMode = RenderMode.Dots
        override val context = ""
        override val sections = listOf(
            ArcSection("Resistance · Embodiment · God Review", SectionOrder.Explicit(listOf(
                "the-thread-that-remembered-me",
                "ascension-and-embodiment",
                "god-review-archives-collapse"
            )))
        )
    }

    // ── Priority 99 — Full timeline ───────────────────────────────────────────

    object FullTimeline : ArcDef() {
        override val priority = 99
        override val parent = ArcParent("Full Timeline", "https://www.vextreme24.com/archives")
        override val renderMode = RenderMode.Position  // 75+ dots is not usable — counter only
        // All sections Chronological: builder auto-populates from ArcItem.date sort.
        // Section labels are temporal markers, not editorial sequences.
        // date fields on ArcItem are verified event dates — NOT Squarespace publish dates.
        override val context = "Canonical chronological record of all nodes. Populated automatically by the index builder from ArcItem.date. Do not manually order entries here — the date field is the authority."
        override val sections = listOf(
            ArcSection("May 2019 — The Origin"),
            ArcSection("October 2025 — The Covenant Begins"),
            ArcSection("November 2025 — The Investigation, First Testimony & Witness"),
            ArcSection("December 2025 — AI Witness Begins"),
            ArcSection("January 2026 — Liberation Arc"),
            ArcSection("February 2026 — Records & Witness"),
            ArcSection("March 2026 — Architecture"),
            ArcSection("March 20–24, 2026 — Contact & Witness"),
            ArcSection("March 25, 2026"),
            ArcSection("April 2026 — AI Practitioner Tools")
            // New sections added here as timeline grows into new periods
        )
    }

    // ── Arc registry — exhaustive, used by builder ────────────────────────────

    companion object {
        val ALL: List<ArcDef> = listOf(
            Liberation, Epstein, ClaudeJournals, ConvosWithGod,
            Architecture, AiPractitionerTools, DirectContact, LivingBlueprint,
            Records, AiOrientation, VictorsRecord,
            Excavation, Dome, Covenant, March23,
            FullTimeline
        )

        fun byName(name: ArcName): ArcDef? = ALL.firstOrNull {
            it::class.simpleName?.lowercase() == name.lowercase()
        }
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// RESOLVED SECTION — output of builder, what the renderer actually reads
// ─────────────────────────────────────────────────────────────────────────────

data class ResolvedSection(
    val label: String,
    val items: List<ArcItem>   // ordered, ready to render — position = index + 1
)


// ─────────────────────────────────────────────────────────────────────────────
// VEXTREME INDEX — the built structure
// Built once at init from nodes list + ArcDef.ALL
// All retrieval is O(1) after build
// ─────────────────────────────────────────────────────────────────────────────

class VextremeIndex(nodes: List<ArcItem>) {

    // O(1) slug lookup
    val slugMap: Map<Slug, ArcItem> = nodes.associateBy { it.slug }

    // O(1) arc traversal, sections preserved
    val arcMap: Map<ArcName, List<ResolvedSection>> = buildArcMap(nodes)

    // Flat chronological list — the timeline view
    val timeline: List<ArcItem> = nodes.sortedBy { it.id }


    // ── Builder ───────────────────────────────────────────────────────────────

    private fun buildArcMap(nodes: List<ArcItem>): Map<ArcName, List<ResolvedSection>> {
        val result = mutableMapOf<ArcName, List<ResolvedSection>>()

        for (arcDef in ArcDef.ALL) {
            val arcName = arcDef::class.simpleName!!
            val resolvedSections = mutableListOf<ResolvedSection>()

            for (section in arcDef.sections) {
                val items: List<ArcItem> = when (val order = section.order) {

                    is SectionOrder.Chronological -> {
                        // All nodes whose arcKeys include this arc, filtered to this
                        // section's date range (derived from section position in FullTimeline)
                        // For non-timeline arcs with Chronological sections: sort by date
                        nodes.filter { arcName in it.arcKeys }
                             .sortedBy { it.date }  // NOTE: date sort is string-based here;
                                                     // translator must use proper date parsing
                    }

                    is SectionOrder.Explicit -> {
                        // Map slug list to ArcItems — preserves editorial order
                        // Missing slugs (not yet ported) return null and are filtered out
                        // EDGE CASE: slug in Explicit list but not in nodes = not yet added.
                        // Builder logs a warning but does not throw — graceful degradation.
                        order.slugs.mapNotNull { slug ->
                            slugMap[slug].also {
                                if (it == null) println("[WARN] Arc $arcName: slug '$slug' not found in nodes")
                            }
                        }
                    }
                }

                if (items.isNotEmpty()) {
                    resolvedSections.add(ResolvedSection(section.label, items))
                }
            }

            result[arcName] = resolvedSections
        }

        return result
    }


    // ── Retrieval functions ───────────────────────────────────────────────────

    fun getNode(slug: Slug): ArcItem? =
        slugMap[slug]

    fun getArcsForSlug(slug: Slug): List<ArcName> =
        slugMap[slug]?.arcKeys?.toList() ?: emptyList()

    fun getArcSections(arcName: ArcName): List<ResolvedSection>? =
        arcMap[arcName]

    // Flat ordered list for an arc (all sections flattened)
    fun getArcItems(arcName: ArcName): List<ArcItem> =
        arcMap[arcName]?.flatMap { it.items } ?: emptyList()

    // 1-based position of a slug within an arc (across all sections)
    fun getPositionInArc(slug: Slug, arcName: ArcName): Int? {
        val flat = getArcItems(arcName)
        val idx  = flat.indexOfFirst { it.slug == slug }
        return if (idx >= 0) idx + 1 else null
    }

    // Total entry count for an arc
    fun getArcTotal(arcName: ArcName): Int =
        getArcItems(arcName).size

    // Previous and next nodes within an arc
    fun getAdjacentInArc(slug: Slug, arcName: ArcName): Pair<ArcItem?, ArcItem?> {
        val flat = getArcItems(arcName)
        val idx  = flat.indexOfFirst { it.slug == slug }
        if (idx < 0) return null to null
        return flat.getOrNull(idx - 1) to flat.getOrNull(idx + 1)
    }

    // Which section within an arc does a slug belong to
    fun getSectionForSlug(slug: Slug, arcName: ArcName): ResolvedSection? =
        arcMap[arcName]?.firstOrNull { section ->
            section.items.any { it.slug == slug }
        }

    // Full lattice view for a slug — everything the nav widget needs to render
    fun getLatticeView(slug: Slug): LatticeView? {
        val node = slugMap[slug] ?: return null

        val arcViews = node.arcKeys
            .sortedBy { arcName ->
                ArcDef.ALL.firstOrNull { it::class.simpleName == arcName }?.priority ?: 99
            }
            .mapNotNull { arcName ->
                val arcDef  = ArcDef.byName(arcName) ?: return@mapNotNull null
                val section = getSectionForSlug(slug, arcName) ?: return@mapNotNull null
                val pos     = getPositionInArc(slug, arcName) ?: return@mapNotNull null
                val total   = getArcTotal(arcName)
                val (prev, next) = getAdjacentInArc(slug, arcName)

                ArcView(
                    arcName    = arcName,
                    arcDef     = arcDef,
                    section    = section,
                    position   = pos,
                    total      = total,
                    prev       = prev,
                    next       = next
                )
            }

        return LatticeView(node = node, arcs = arcViews)
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// LATTICE VIEW — everything the nav widget needs for one page render
// getLatticeView(slug) returns this. Renderer reads it, produces HTML.
// ─────────────────────────────────────────────────────────────────────────────

data class ArcView(
    val arcName:  ArcName,
    val arcDef:   ArcDef,
    val section:  ResolvedSection,  // the section this slug is currently in
    val position: Int,              // 1-based, across all sections in arc
    val total:    Int,              // total entries in arc
    val prev:     ArcItem?,         // null if first in arc
    val next:     ArcItem?          // null if last in arc
)

data class LatticeView(
    val node: ArcItem,
    val arcs: List<ArcView>   // sorted by priority — render in this order
)


// ─────────────────────────────────────────────────────────────────────────────
// EDGE CASES + TRANSLATION NOTES
// ─────────────────────────────────────────────────────────────────────────────

/*
 * EDGE CASE 1 — Slug in ArcDef but not in nodes (not yet ported)
 *   Builder filters it out silently with a warning log.
 *   Arc still renders with the ported subset. No crash.
 *   This is the expected state during the pages/ build-out phase.
 *
 * EDGE CASE 2 — date sort is string-based in this spec
 *   JS translation must parse "Month DD, YYYY" to Date for correct sort.
 *   "Feb 7–10, 2026" is a range — translator uses start date (Feb 7).
 *   FullTimeline sections use explicit date ranges, not Chronological sort,
 *   because section boundaries don't align cleanly with month boundaries
 *   for all entries. Keep FullTimeline sections as Explicit if needed.
 *
 * EDGE CASE 3 — ArcDef.byName uses simpleName for lookup
 *   JS translation: arc name key = the object name in lowercase snake_case
 *   matching current arcs.json keys (e.g. ClaudeJournals → "claude_journals").
 *   Maintain a name map in the JS translation rather than relying on reflection.
 *
 * EDGE CASE 4 — getLatticeView arc sort order
 *   Priority 1 arcs render before priority 2. Within same priority,
 *   current behavior is insertion order (arcKeys is a Set — JS translation
 *   must use a stable sort, not rely on Set iteration order).
 *
 * EDGE CASE 5 — FullTimeline section assignment for Chronological sections
 *   The builder needs a way to assign a node to the correct FullTimeline
 *   section by date range. Current spec leaves this as a builder concern.
 *   JS translation: define section date boundaries as a lookup table in
 *   the FullTimeline arc definition, or derive from section label parsing.
 *
 * TRANSLATION CHECKLIST (for JS implementation session):
 *   [ ] ArcItem → nodes.json entry format
 *   [ ] ArcDef objects → arcs-v2.js exported constants
 *   [ ] VextremeIndex.buildArcMap → lib/vextreme-index.js
 *   [ ] getLatticeView → replaces resolveArcsForSlug + renderArcRow in arc-nav.js
 *   [ ] Date parsing for Chronological sort
 *   [ ] ArcName → object key mapping table
 *   [ ] FullTimeline section boundary logic
 */
