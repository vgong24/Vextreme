# Task-aware orientation packets

**Status:** proposed by Orientation Integrity `3/4`, pending review

## Purpose

`lib/select-orientation-context.js` turns a bounded task description into the
smallest deterministic packet supported by `data/orientation-map.json`. It is a
router, not a search engine and not an authority engine.

```bash
node lib/select-orientation-context.js \
  --task "fix a public page whose shared navigation is missing" \
  --path pages/example.html
```

Inputs may be repeated:

- `--question <question-id>` uses an exact id from the generated question index;
- `--path <repository-relative-path>` routes through registered source and
  projection boundaries;
- `--task <text>` matches authored trigger phrases literally;
- `--max-maps <n>` can tighten the packet, but never expands beyond five maps.

## Selection contract

Every packet contains `cold-start` and `work-coordination`. These are the safety
baseline: repository rules plus live-claim verification. Task-specific maps are
then ranked by exact question id, registered path containment, and literal trigger
matches. Ties resolve by map id. At most three task-specific maps join the two
baseline maps.

The selector does not recursively load adjacent maps. It returns forward and
reverse edges as bounded next routes so the reader can expand only when the first
packet leaves a named gap. Directory paths represent registered corpus boundaries;
use the selected map's question route or projection to choose the smallest file
inside that boundary rather than bulk-reading it.

The output distinguishes:

- `source` from `projection` reads;
- authority and freshness from selection score;
- current health checks from historical verification evidence;
- a routed answer from a partial baseline-only result;
- selected evidence from exclusions and unknowns.

## Fail-closed boundaries

The selector performs no network request, filesystem crawl, embedding, semantic
search, AI/RAG inference, or private-repository discovery. Absolute paths and `..`
traversal are rejected. A mention of SDK or private work selects only the public
boundary map; it does not reveal or infer private paths, algorithms, counts,
roadmap state, client data, credentials, worker availability, or implementation
permission.

`work-coordination` is always present because a technically relevant source can
still be actively owned. Its claim visibility never proves availability, capacity,
authorization, review, merge order, or human acceptance.

## Reading the packet

1. Check `status` and `gaps`. A partial packet is a request for a narrower question,
   not permission to broaden the search.
2. Follow `readOrder` in sequence and preserve each item's `source` or `projection`
   role.
3. Run only the returned `healthChecks` that apply to the current environment.
4. Use `nextRoutes` only when the selected evidence cannot answer the task.
5. Treat `boundaries` and each map's `exclusions` as part of the answer.

The packet is orientation evidence only. Victor's explicit permission envelope and
review decisions remain separate.

<!-- [VXG RealForever] -->
