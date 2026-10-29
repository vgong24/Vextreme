'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const projector = require('./project_arc_batch.js');

const DEFAULT_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_FORMATION_REL = path.join('docs','ingestion','workmaps','content-forge-vxg-council-declaration-standalone-formation.json');
const NODES_REL = path.join('data','nodes.json');
const INTENTS_REL = path.join('config','content-intents.json');
const VIEWMODELS_REL = path.join('data','viewmodels.json');
const GENERATOR_REF = 'tools/vex-content-forge/project_standalone_page.js';

class StandaloneProjectionError extends Error {
  constructor(code, message) { super(message); this.name='StandaloneProjectionError'; this.code=code; }
}
const invariant=(condition,code,message)=>{ if(!condition) throw new StandaloneProjectionError(code,message); };
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const sha256=data=>crypto.createHash('sha256').update(data).digest('hex');

function writeAtomic(file, content) {
  const value = content.endsWith('\n') ? content : content + '\n';
  if (fs.existsSync(file) && fs.readFileSync(file,'utf8') === value) return false;
  fs.mkdirSync(path.dirname(file), { recursive:true });
  const temp = file + '.tmp-' + process.pid + '-' + crypto.randomBytes(4).toString('hex');
  fs.writeFileSync(temp,value,'utf8');
  fs.renameSync(temp,file);
  return true;
}
function placementMeta(page, placement) {
  invariant(/^[a-z0-9-]+$/.test(placement.department || ''),'PLACEMENT_DEPARTMENT',String(placement.department));
  invariant(/^[a-z0-9-]+$/.test(placement.workType || ''),'PLACEMENT_WORK_TYPE',String(placement.workType));
  const meta = '<meta name="vex:department" content="' + placement.department + '"/>'
    + '<meta name="vex:workType" content="' + placement.workType + '"/>';
  invariant(page.includes('</head>'),'PLACEMENT_HEAD','generated page has no </head>');
  return page.replace('</head>', meta + '</head>');
}
function validateFormation(value) {
  invariant(value?.schemaVersion === 'vex-content-forge.standalone-page-formation/v0.1','FORMATION_SCHEMA',value?.schemaVersion);
  invariant(value.ownerRef === 'github.issue.vextreme.159','FORMATION_OWNER',value.ownerRef);
  invariant(value.plannedSourceManagedProjector === GENERATOR_REF,'FORMATION_PROJECTOR',value.plannedSourceManagedProjector);
  invariant(value.plannedPlacementApplier === 'lib/apply-content-intents.js','FORMATION_APPLIER',value.plannedPlacementApplier);
  const member=value.member, placement=value.placement;
  invariant(member && typeof member.slug === 'string' && member.slug.length > 0,'FORMATION_MEMBER','member');
  invariant(member.canonicalNodeId === null,'FORMATION_CANONICAL_ID','standalone department page must remain id-null');
  invariant(Array.isArray(member.arcKeys) && member.arcKeys.length === 0,'FORMATION_ARCS','standalone department page must not invent narrative arcs');
  invariant(placement?.registerNode === true && placement.intentId,'FORMATION_INTENT','placement intent');
  invariant(placement.narrativeArcPlacement === null && placement.fullTimelinePlacement === false,'FORMATION_HELD_ARCS','held arc placement');
  invariant(value.lifecycle?.draftOnly === true && value.lifecycle?.mergeAuthority === false,'FORMATION_LIFECYCLE','draft only');
}
function projectFormation(root=DEFAULT_ROOT, options={}) {
  const formationRel=options.formationRel || DEFAULT_FORMATION_REL;
  const formation=readJson(path.join(root,formationRel));
  validateFormation(formation);
  const member=formation.member, placement=formation.placement;
  const nodes=readJson(path.join(root,NODES_REL));
  const existing=nodes.find(node=>node.slug===member.slug) || null;
  const expectedNode={
    id:null, slug:member.slug, title:placement.canonicalTitle, date:placement.canonicalDate,
    arcKeys:[], department:placement.department, workType:placement.workType, vexData:{},
  };
  if(existing) {
    for(const key of ['id','slug','title','date','department','workType']) {
      invariant(JSON.stringify(existing[key])===JSON.stringify(expectedNode[key]),'CANONICAL_NODE_DRIFT',member.slug+':'+key);
    }
    invariant(JSON.stringify(existing.arcKeys||[])===JSON.stringify([]),'CANONICAL_NODE_ARCS',member.slug);
  }

  const intentManifest=readJson(path.join(root,INTENTS_REL));
  const intent=(intentManifest.intents||[]).find(item=>item.id===placement.intentId);
  invariant(intent,'PLACEMENT_INTENT_MISSING',placement.intentId);
  invariant(intent.slug===member.slug && intent.department===placement.department && intent.workType===placement.workType,'PLACEMENT_INTENT_DRIFT',placement.intentId);
  invariant(intent.title===placement.canonicalTitle && intent.date===placement.canonicalDate && intent.registerNode===true,'PLACEMENT_INTENT_CANONICAL_DRIFT',placement.intentId);

  const virtualNode=existing || expectedNode;
  const nodesBySlug=new Map([[member.slug,virtualNode]]);
  const projection=projector.projectMember(root,member,nodesBySlug,projector.loadAssetCatalog(root));
  projection.page=placementMeta(projection.page,placement);
  projection.strings._meta.placement={
    department:placement.department,
    workType:placement.workType,
    intentId:placement.intentId,
  };

  const immutableFiles=[NODES_REL,INTENTS_REL];
  const before=Object.fromEntries(immutableFiles.map(file=>[file,sha256(fs.readFileSync(path.join(root,file)))]));
  const changedPaths=[];
  if(!options.dryRun) {
    if(fs.existsSync(projection.pagePath)) {
      invariant(fs.readFileSync(projection.pagePath,'utf8').includes('data-content-forge-generator="'+projector.GENERATOR_REF+'"')
        || fs.readFileSync(projection.pagePath,'utf8').includes('data-content-forge-generator="'+GENERATOR_REF+'"'),
        'DESTINATION_NOT_OWNED',projection.pagePath);
    }
    projection.page=projection.page.replace('data-content-forge-generator="'+projector.GENERATOR_REF+'"','data-content-forge-generator="'+GENERATOR_REF+'"');
    if(writeAtomic(projection.pagePath,projection.page)) changedPaths.push(path.relative(root,projection.pagePath));
    if(writeAtomic(projection.stringsPath,JSON.stringify(projection.strings,null,2))) changedPaths.push(path.relative(root,projection.stringsPath));
    const viewmodelsPath=path.join(root,VIEWMODELS_REL);
    const viewmodels=readJson(viewmodelsPath);
    viewmodels[member.slug]=projection.viewmodel;
    if(writeAtomic(viewmodelsPath,JSON.stringify(viewmodels,null,2))) changedPaths.push(VIEWMODELS_REL);
  }
  const after=Object.fromEntries(immutableFiles.map(file=>[file,sha256(fs.readFileSync(path.join(root,file)))]));
  invariant(JSON.stringify(after)===JSON.stringify(before),'HELD_SOURCE_MUTATION','nodes/intents');
  const result={
    schemaVersion:'vex-content-forge.standalone-page-result/v0.1',
    slug:member.slug,
    generator:GENERATOR_REF,
    disposition:'PROJECTED',
    changedPaths:[...new Set(changedPaths)].sort(),
    next:'APPLY_CONTENT_INTENT',
  };
  if(!options.silent) process.stdout.write(JSON.stringify(result,null,2)+'\n');
  return result;
}
if(require.main===module) {
  try { projectFormation(DEFAULT_ROOT); }
  catch(error) { process.stderr.write((error.stack||error.message)+'\n'); process.exitCode=1; }
}
module.exports={ DEFAULT_ROOT, DEFAULT_FORMATION_REL, GENERATOR_REF, StandaloneProjectionError, placementMeta, projectFormation, validateFormation };

// [VXG RealForever]
