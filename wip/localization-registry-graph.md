# Localization Registry Graph
 
## Module-Level Architecture for Globalization, Reusable Strings, Vendor Translation, Plurals, and AI-Safe Modification
 
**Status:** Final draft mapping
**Purpose:** Localization module architecture
**Parent architecture:** `docs/architecture/ui-identity-registry-graph.md`
**Audience:** Codex, Claude, localization maintainers, AI coding agents, translation vendors, repo maintainers
**Scope:** Strings, messages, locales, bindings, plurals, placeholders, vendor workflow, localization health checks
 
---
 
# 1. Executive Summary
 
Localization should not be managed as duplicated HTML files or isolated translation tables.
 
It should be managed as a lower-layer map inside the larger **UI Identity Registry Graph**.
 
The localization system should know:
 
```txt
what the text means
where it appears
which UIElementKey owns it
which locales render it
which strings are reused
which plurals/placeholders are required
which vendor batch translated it
which edits invalidate translations
which contexts are affected by modification
```
 
The goal is not only translation.
 
The goal is traceable globalized meaning.
 
---
 
# 2. Relationship to Parent Architecture
 
The parent architecture defines:
 
```txt
UIElementKey
ContextNode
BindingNode
LayerMap
Graph Query API
Health Checks
AI Condition
```
 
This localization module defines:
 
```txt
StringNode
MessageNode
LocaleValue
Plural Rules
Placeholder Rules
Vendor Export/Import
Localization Validation
Translation Reuse
```
 
Relationship:
 
```txt
UIElementKey
  → binding
  → stringId or messageId
  → locale rendering
  → output page/component
```
 
Example:
 
```txt
vextreme.web.dossier.rec-y34-localization.title
  → STR-LOCALIZATION-CYCLE
  → zh
  → 本地化流程：六个月缩短到两周
```
 
The `UIElementKey` does not need to store every language.
 
It only needs to route to the localization map.
 
---
 
# 3. Core Principle
 
Localization should begin from meaning, not from copied text.
 
The architecture separates:
 
```txt
Meaning
Language rendering
UI context
Platform binding
Variant
Plural logic
Vendor workflow
Modification impact
```
 
This prevents:
 
```txt
duplicated translations
orphaned strings
untraceable copy edits
broken placeholders
invalid plural forms
vendor confusion
AI-generated drift
HTML files silently diverging across languages
```
 
---
 
# 4. Core Objects
 
## 4.1 StringNode
 
A reusable meaning node for static text.
 
Example:
 
```txt
STR-LOCALIZATION-CYCLE
```
 
## 4.2 MessageNode
 
A reusable meaning node for dynamic, variable-dependent, or pluralized text.
 
Example:
 
```txt
MSG-FILES-UPLOADED
```
 
## 4.3 LocaleValue
 
A language-specific rendering of a StringNode or MessageNode.
 
Example:
 
```txt
STR-LOCALIZATION-CYCLE + zh = 本地化流程：六个月缩短到两周
```
 
## 4.4 LocalizationBinding
 
Connection between a UIElementKey and a string or message.
 
Example:
 
```txt
vextreme.web.dossier.rec-y34-localization.title
  → STR-LOCALIZATION-CYCLE
```
 
## 4.5 ContextNote
 
Translator-facing explanation of where the text appears and what it means.
 
## 4.6 VendorBatch
 
A controlled translation package exported for vendors.
 
---
 
# 5. Recommended File Structure
 
```txt
localization/
  strings.csv
  messages.csv
  bindings.csv
  variants.csv
  plural-rules.csv
  placeholder-rules.csv
  rich-text-rules.csv
  vendor-notes.csv
 
  locales/
    en.csv
    zh.csv
    ja.csv
    es.csv
 
  vendor/
    exports/
    imports/
    instructions/
 
generated/
  localization-index.json
  missing-locales.json
  stale-translations.json
  duplicate-string-candidates.json
  placeholder-report.json
  plural-report.json
  vendor-import-report.json
```
 
---
 
# 6. Segment Legend
 
Dot-separated IDs must be explainable.
 
Recommended binding grammar:
 
```txt
{productId}.{surfaceId}.{pageId}.{contextId}.{slot}.{variant}
```
 
Example:
 
```txt
vextreme.web.dossier.rec-y34-localization.title.default
```
 
Meaning:
 
```txt
productId: vextreme
surfaceId: web
pageId: dossier
contextId: rec-y34-localization
slot: title
variant: default
```
 
Segment registry:
 
```csv
segment_type,meaning,example,notes
productId,Product or repo identity,vextreme,Stable product namespace
surfaceId,Rendering surface,web,Could be web/android/ios/docs/email
pageId,Page or route,dossier,High-level page identity
contextId,Structural content container,rec-y34-localization,Usually maps to DOM/context registry
slot,Text role,title,title/body/result/metric/cta/etc.
variant,Intentional wording variant,default,default/mobile/investor/ab-a/etc.
```
 
---
 
# 7. Context Registry
 
The context registry explains where the string lives.
 
```csv
context_id,parent_id,type,label,description,source_dom_id
dossier,,page,Victor Dossier,Main dossier page,DOSSIER-ROOT
sec-proofs,dossier,section,Proofs,The six-proof evidence section,SEC-PROOFS
rec-y34-localization,sec-proofs,record,Localization Proof,Localization cycle-time proof card,REC-Y34-LOCALIZATION
rec-y34-uielementkey,sec-proofs,record,UIElementKey Proof,Cross-discipline identity proof card,REC-Y34-UIELEMENTKEY
```
 
This lets translators, scripts, and AI agents know:
 
```txt
This is not floating text.
This is the title slot of a proof record inside the proof section of the dossier page.
```
 
---
 
# 8. Category / Fit Map
 
The fit map answers:
 
```txt
What kinds of strings are allowed here?
```
 
Example:
 
```csv
category_id,category_name,accepts,rejects,required_slots,optional_slots
proof-record,Evidence proof card,"year,title,body,result,metric","nav,footer,legal-disclaimer","year,title,body,result","metric,source"
fit-card,Audience fit card,"title,description","proof metric,long narrative","title,description","example"
page-header,Hero/header region,"eyebrow,h1,thesis,identity-line","record result,footer note","h1,thesis","eyebrow,identity-line"
self-note,Meta explanation note,"body,inline-code","main claim,metric,nav","body","code"
```
 
This is the reverse-witnessing layer.
 
It tells the system not only what something is, but where it can validly belong.
 
---
 
# 9. String Registry
 
The string registry stores canonical meaning.
 
```csv
string_id,canonical_meaning,reuse_group,content_type,change_policy
STR-LOCALIZATION-CYCLE,"Localization cycle reduced from six months to two weeks",localization-proof,plain_text,editable
STR-METHOD-SIX-PROOFS,"One method, six proofs",methodology-heading,plain_text,editable
STR-AI-MAINTAINABLE,"The sixth application: AI-maintainable systems",ai-application,plain_text,editable
STR-UIELEMENTKEY-CONCEPT,"Composite identity joining engineering, design, QA, and localization",ui-identity,rich_text,review-required
```
 
Important rule:
 
```txt
String ID identifies meaning.
Locale files render that meaning.
Bindings place that meaning into UI contexts.
```
 
English text is not the source of truth.
 
The meaning node is the source of truth.
 
---
 
# 10. Locale Files
 
Locale files store language-specific renderings.
 
```csv
string_id,locale,text,status,reviewed_by,last_updated
STR-LOCALIZATION-CYCLE,en,"Localization: 6 months → 2 weeks",approved,Victor,2026-07-06
STR-LOCALIZATION-CYCLE,zh,"本地化流程：六个月缩短到两周",approved,Victor,2026-07-06
STR-METHOD-SIX-PROOFS,en,"One method, six proofs",approved,Victor,2026-07-06
STR-METHOD-SIX-PROOFS,zh,"一个方法，六次实证",approved,Victor,2026-07-06
```
 
Adding a new language should mean adding locale rows, not duplicating page structure.
 
---
 
# 11. Binding Registry
 
Bindings connect UIElementKeys to strings or messages.
 
```csv
binding_id,ui_element_key,string_id,message_id,slot,variant,platform,order
bind.dossier.localization.title,vextreme.web.dossier.rec-y34-localization.title,STR-LOCALIZATION-CYCLE,,title,default,web,1
bind.dossier.method.heading,vextreme.web.dossier.sec-proofs.heading,STR-METHOD-SIX-PROOFS,,heading,default,web,2
bind.dashboard.upload.status,vextreme.web.dashboard.upload-status.message,,MSG-FILES-UPLOADED,status-message,default,web,3
```
 
Only one of `string_id` or `message_id` should be populated.
 
Use `message_id` for dynamic, count-based, or plural-sensitive text.
 
---
 
# 12. Message Registry
 
Plural-sensitive or variable-dependent content should use message IDs.
 
```csv
message_id,description,variables,message_type
MSG-FILES-UPLOADED,Upload completion message,count,plural
MSG-RECORDS-FOUND,Search result count,count,plural
MSG-DAYS-REMAINING,Deadline countdown,count,plural
MSG-WELCOME-USER,Personalized welcome message,userName,variable
```
 
Locale messages:
 
```csv
message_id,locale,message,status
MSG-FILES-UPLOADED,en,"{count, plural, one {# file uploaded} other {# files uploaded}}",approved
MSG-FILES-UPLOADED,zh,"已上传 {count} 个文件",approved
MSG-RECORDS-FOUND,en,"{count, plural, one {# record found} other {# records found}}",approved
MSG-RECORDS-FOUND,zh,"找到 {count} 条记录",approved
```
 
---
 
# 13. Plural Rules
 
Plural considerations are first-class.
 
English has `one` and `other`.
 
Chinese often does not require grammatical plural branching in the same way.
 
Other languages may require more plural categories.
 
Plural rules registry:
 
```csv
locale,required_plural_categories
en,"one,other"
zh,"other"
ja,"other"
ar,"zero,one,two,few,many,other"
ru,"one,few,many,other"
pl,"one,few,many,other"
```
 
Validation must check:
 
```txt
Required plural categories exist for each locale.
Plural variable is present.
No unknown plural categories are introduced.
No required branch is missing.
```
 
Rule:
 
```txt
If meaning depends on count, do not use a plain string.
Use a message_id.
```
 
---
 
# 14. Placeholder Rules
 
Any string or message with variables must preserve placeholders.
 
Placeholder registry:
 
```csv
id,variable_name,type,required,description,example
MSG-FILES-UPLOADED,count,number,true,Number of uploaded files,3
MSG-WELCOME-USER,userName,string,true,Displayed user name,Victor
MSG-DATE-RANGE,startDate,date,true,Start date,2026-07-06
MSG-DATE-RANGE,endDate,date,true,End date,2026-07-20
```
 
Validation must check:
 
```txt
All required placeholders exist in every locale.
No unknown placeholders are introduced.
Placeholder type is respected.
Plural messages include the plural variable.
HTML/rich-text tags are preserved safely.
```
 
Bad translation example:
 
```txt
Original: Hello, {userName}
Bad: 你好，{用户名}
```
 
This fails because `{userName}` was removed.
 
---
 
# 15. Rich Text Rules
 
Some strings contain inline markup or code references.
 
Example:
 
```html
<em>context itself</em>
<code>UIElementKey(...)</code>
```
 
Rules registry:
 
```csv
string_id,content_type,allowed_markup,do_not_translate_terms
STR-UIELEMENTKEY-CONCEPT,rich_text,"em,code","UIElementKey"
STR-AI-CONTEXT-DECAY,rich_text,"em,b","AI"
```
 
Validation must check:
 
```txt
Allowed tags only.
No unclosed tags.
No script injection.
Required code tokens preserved.
Do-not-translate terms preserved unless explicitly allowed.
```
 
---
 
# 16. Variant Registry
 
Variants represent intentional divergence.
 
```csv
variant_id,purpose,scope
default,Canonical approved version,global
mobile,Shorter text for mobile layout,platform
investor,Business-facing wording,page-group
ai-platform,AI tooling/company-facing wording,page-group
ab-a,A/B test version A,experiment
vendor,Vendor export simplification,workflow
```
 
Decision rule:
 
```txt
Same meaning, same audience → reuse string.
Same meaning, different audience → create variant.
Different meaning → create new string.
Count-dependent meaning → use message_id.
Legal or regulated text → locked/review-required.
```
 
---
 
# 17. Vendor Export
 
Vendors should receive only what they need.
 
They do not need the full graph.
 
Vendor package should include:
 
```txt
string_id or message_id
source locale
source text
target locale
context summary
slot
tone/audience
placeholder rules
plural rules
do-not-translate terms
notes
```
 
Example export:
 
```csv
id,type,source_locale,source_text,target_locale,context_summary,slot,do_not_translate,notes
STR-LOCALIZATION-CYCLE,string,en,"Localization: 6 months → 2 weeks",zh,"Proof card title about localization cycle-time reduction",title,"6 months → 2 weeks","Keep metric clear"
STR-AI-MAINTAINABLE,string,en,"The sixth application: AI-maintainable systems",zh,"Section heading introducing AI coding platform relevance",heading,"AI","Preserve AI as technical term"
MSG-FILES-UPLOADED,message,en,"{count, plural, one {# file uploaded} other {# files uploaded}}",zh,"Upload status message",status-message,"{count}, #","Preserve placeholder"
```
 
If one string appears in twelve places:
 
```txt
Vendor translates once.
Graph applies twelve times.
```
 
---
 
# 18. Vendor Import
 
Vendor returns:
 
```csv
id,type,target_locale,translated_text,status,vendor_notes
STR-AI-MAINTAINABLE,string,zh,"第六次应用：AI 可自主维护的系统",translated,""
MSG-FILES-UPLOADED,message,zh,"已上传 {count} 个文件",translated,""
```
 
Import validation checks:
 
```txt
ID exists.
Locale expected.
Placeholder preserved.
Plural branches valid.
Rich text valid.
Do-not-translate terms preserved.
Locked strings not modified without review.
```
 
Only validated imports should update locale files.
 
---
 
# 19. New Page Workflow
 
When a new page is added:
 
```txt
1. Parser reads DOM.
2. Extracts text nodes and surrounding context IDs.
3. Proposes UIElementKeys.
4. Detects existing reusable StringNodes/MessageNodes.
5. Creates new bindings.
6. Generates missing locale rows.
7. Updates localization-index.json.
8. Produces missing-work report.
9. Exports only missing/new strings to vendor if needed.
10. CI validates structure.
```
 
Example:
 
```txt
New extracted text:
"The sixth application: AI-maintainable systems"
 
Registry finds:
STR-AI-MAINTAINABLE
 
Action:
Reuse existing string.
Create new binding for the new UIElementKey.
No duplicate translation required.
```
 
---
 
# 20. Modification Workflow
 
When someone edits managed HTML directly:
 
```txt
CI detects registry-managed text changed.
CI reports owning string_id or message_id.
Developer updates registry instead.
Build regenerates output.
```
 
When someone edits a string:
 
```txt
System generates impact report:
- affected UIElementKeys
- affected locales
- affected screenshots
- affected docs
- affected vendor approvals
- affected platform outputs
```
 
Example impact report:
 
```txt
Changed:
STR-LOCALIZATION-CYCLE
 
Affected:
- vextreme.web.dossier.rec-y34-localization.title
- vextreme.web.investor.localization-proof.title
- vextreme.web.ai-platform.localization-case-study.heading
 
Locales:
- en approved
- zh approved
- ja missing
- es pending
 
Recommendation:
Create variant if investor wording should diverge.
Otherwise update canonical string and mark translations stale.
```
 
---
 
# 21. Duplicate Detection
 
When new text is added, the system should check:
 
```txt
Exact match
Normalized match
Semantic similarity
Same canonical meaning
Same reuse group
Different context
Different audience
```
 
Possible outcomes:
 
```txt
Reuse existing string.
Create variant.
Create new string.
Mark as intentional duplicate.
Flag for human review.
```
 
Example:
 
```txt
"AI-generated work decays"
```
 
and
 
```txt
"AI-generated code decays"
```
 
These are similar but not necessarily identical.
 
AI may propose a relationship, but humans approve semantic merging or splitting.
 
---
 
# 22. Localization Query Functions
 
AI agents should not read the whole localization map.
 
They should call summary functions.
 
Recommended functions:
 
```ts
getStringSummary(stringId): StringSummary
 
getMessageSummary(messageId): MessageSummary
 
getLocaleStatus(stringIdOrMessageId): LocaleStatus
 
getBindingsForString(stringId): BindingSummary[]
 
getMissingLocales(scope): MissingLocaleReport
 
getPluralValidationReport(messageId): PluralReport
 
getPlaceholderValidationReport(id): PlaceholderReport
 
getVendorExportBatch(scope): VendorBatch
 
getTranslationImpactReport(id): ImpactReport
 
getReusableStringCandidates(text): Candidate[]
```
 
Example output:
 
```json
{
  "stringId": "STR-LOCALIZATION-CYCLE",
  "canonicalMeaning": "Localization cycle reduced from six months to two weeks",
  "reuseCount": 3,
  "locales": {
    "en": "approved",
    "zh": "approved",
    "ja": "missing"
  },
  "affectedUIElementKeys": [
    "vextreme.web.dossier.rec-y34-localization.title",
    "vextreme.web.investor.localization-proof.title"
  ],
  "risks": [
    "Metric wording must remain intact",
    "Investor variant may need different tone"
  ],
  "recommendedAction": "Use canonical update only if all audiences should share the same wording."
}
```
 
---
 
# 23. Health Checks
 
Every pull request should validate:
 
```txt
Every binding has string_id or message_id.
Every string_id exists.
Every message_id exists.
Every required locale exists.
No placeholder is removed.
Plural categories are valid.
Rich-text tags are valid.
Locked terms are preserved.
Duplicate strings are reviewed.
No orphaned locale rows remain active.
No binding points to deleted context.
No managed HTML text changes outside registry.
Vendor imports pass validation.
Localized screenshot diffs are generated where required.
```
 
Example report:
 
```txt
Localization Health Report
 
✅ 122 bindings valid
✅ en locale complete
✅ zh locale complete
⚠️ ja locale missing 14 strings
❌ MSG-FILES-UPLOADED missing required plural category: other
❌ STR-WELCOME-USER zh translation removed placeholder {userName}
⚠️ STR-LOCALIZATION-CYCLE reused in 3 contexts; confirm global edit
```
 
---
 
# 24. Edge Cases
 
## Same English, different meaning
 
```txt
"Home"
```
 
Could mean:
 
```txt
homepage
physical house
device home screen
return destination
```
 
Solution:
 
```txt
Create separate string IDs with separate canonical meanings.
```
 
## Same meaning, different wording
 
```txt
"One method, six proofs"
"One method, proven six ways"
```
 
Solution:
 
```txt
Same reuse group, different variant.
```
 
## Chinese does not need English-style plural
 
English:
 
```txt
{count, plural, one {# file uploaded} other {# files uploaded}}
```
 
Chinese:
 
```txt
已上传 {count} 个文件
```
 
Solution:
 
```txt
Validate per-locale plural requirements.
Do not force English plural structure onto every language.
```
 
## Translation expands layout
 
Solution:
 
```txt
Use design layout constraints.
Create mobile/short variants if needed.
```
 
## Vendor removes placeholder
 
Solution:
 
```txt
Import validation fails.
```
 
## String removed from one page but reused elsewhere
 
Solution:
 
```txt
Deactivate binding.
Do not delete string until no active bindings remain.
```
 
## AI invents a new key for existing meaning
 
Solution:
 
```txt
Duplicate detection suggests reuse.
Human approves reuse or new node.
```
 
---
 
# 25. Build Scripts
 
Required scripts:
 
```txt
extract-strings.js
extract-html-structure.js
generate-localization-index.js
detect-duplicate-strings.js
detect-orphan-locales.js
validate-bindings.js
validate-placeholders.js
validate-plurals.js
validate-rich-text.js
validate-vendor-import.js
generate-missing-locales.js
generate-translation-impact-report.js
export-vendor-batch.js
import-vendor-batch.js
apply-locales-to-html.js
```
 
The localization module should be self-maintaining through scripts wherever possible.
 
Humans should approve meaning.
 
Scripts should maintain structure.
 
---
 
# 26. AI Role in Localization
 
AI should assist with:
 
```txt
mapping legacy strings into StringNodes
detecting semantic duplicates
recommending variants
creating translator context notes
explaining impact reports
converting inconsistent locale files
generating vendor instructions
refactoring duplicated HTML into registry-managed output
```
 
AI should not be the only mechanism that remembers localization state.
 
The registry remembers.
 
AI interprets ambiguity.
 
---
 
# 27. Vendor Simplicity
 
The vendor-facing workflow should remain simple:
 
```txt
Translate these rows.
Preserve these placeholders.
Follow these plural rules.
Do not translate these terms.
Use this context note.
Return the completed file.
```
 
The internal system handles:
 
```txt
reuse
bindings
impact reports
approval status
locale completeness
page regeneration
cross-platform application
```
 
This keeps vendors productive without exposing internal complexity.
 
---
 
# 28. Final Compression
 
The Localization Registry Graph is:
 
```txt
A lower-layer map within the UI Identity Registry Graph where reusable StringNodes and MessageNodes are bound to UIElementKeys, rendered through locale-specific values, validated through plural/placeholder/rich-text rules, exported to vendors through simplified batches, and maintained through build scripts, health checks, and impact reports.
```
 
The central rule:
 
```txt
Localization is not text replacement.
Localization is identity management for meaning across languages, contexts, platforms, vendors, and time.
```
 
The operating culture:
 
```txt
Translate once.
Bind many times.
Validate automatically.
Approve meaning.
Regenerate output.
Expose impact before change.
```
 
The purpose:
 
```txt
Make every localized string witnessable:
what it means,
where it appears,
which UI element owns it,
which languages render it,
which variants exist,
which placeholders/plurals matter,
which vendor touched it,
and what breaks if it changes.
```