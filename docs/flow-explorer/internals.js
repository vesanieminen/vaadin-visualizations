/* Copyright 2026 Vaadin Ltd. Licensed under the Apache License, Version 2.0. */
(() => {
  'use strict';
  const { profiles, mappings } = window.FLOW_INTERNALS_CONTENT;
  const snapshot = window.FLOW_SNAPSHOT;
  const esc = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
    );
  const get = (scene, node) => profiles[mappings[scene]?.[node]];
  function anchor(part) {
    const source = snapshot.sources[part.source];
    const lines = snapshot.files[source.path].split('\n');
    const matches = lines.map((line, i) => (line.includes(part.marker) ? i + 1 : 0)).filter(Boolean);
    if (!matches.length) throw new Error(`Missing anatomy anchor: ${part.source}: ${part.marker}`);
    // Prefer the occurrence in/after the curated source entry point when a
    // method has overloads or a validation path repeats similar operations.
    const line = matches.find((value) => value >= source.line) || matches[0];
    return { ...source, line, excerpt: lines.slice(line - 1, line + 12) };
  }
  function packageFor(key) {
    const path = snapshot.sources[key].path;
    return snapshot.atlas.packages.find((pkg) => pkg.files.includes(path));
  }
  function packageRoute(pkg) {
    return (
      '#atlas?' +
      new URLSearchParams({
        module: pkg.module,
        namespace: pkg.language + ':' + pkg.name,
        selected: '@' + pkg.id,
        relation: 'imports'
      })
    );
  }
  function link(scene, node, part = 0, step = 0, lens = 'concepts') {
    return `#inside/${scene}/${node}/${part}?step=${step}&lens=${lens}`;
  }
  function preview(scene, node, step, lens) {
    const profile = get(scene, node);
    return `<div class="step-kicker">WHAT THIS CONCEPT IS MADE OF</div><h3>${esc(profile.title)}</h3><p class="detail">${esc(profile.assembly)}</p><div class="inside-preview">${profile.parts.map((part, i) => `<a href="${link(scene, node, i, step, lens)}"><span class="inside-number">0${i + 1}</span><span><strong>${esc(part.name)}</strong><small>${esc(part.role)}</small></span><span>↗</span></a>`).join('')}</div><a class="inside-open" href="${link(scene, node, 0, step, lens)}">Explore the internals <span>→</span></a>`;
  }
  function render(sceneId, nodeId, partId, query) {
    const scene = window.FLOW_CONTENT.scenes.find((item) => item.id === sceneId) || window.FLOW_CONTENT.scenes[0];
    const node = scene.nodes.find((item) => item.id === nodeId) || scene.nodes[0];
    const profile = get(scene.id, node.id);
    const selected = Math.max(0, Math.min(Math.trunc(Number(partId)) || 0, profile.parts.length - 1));
    const params = new URLSearchParams(query);
    const step = Math.max(0, Math.min(Math.trunc(Number(params.get('step'))) || 0, scene.steps.length - 1));
    const lens = params.get('lens') === 'classes' ? 'classes' : 'concepts';
    const route = (i) => link(scene.id, node.id, i, step, lens);
    const back = `#story/${scene.id}/${step}/${lens}?node=${node.id}&tab=inside`;
    const part = profile.parts[selected];
    const source = anchor(part);
    const pkg = packageFor(part.source);
    const packages = [
      ...new Map(
        profile.parts
          .map((item) => packageFor(item.source))
          .filter(Boolean)
          .map((item) => [item.id, item])
      ).values()
    ];
    const related = scene.nodes.filter((item) => item.id !== node.id);
    document.getElementById('main').innerHTML = `
      <div class="inside-breadcrumb"><a href="${back}">← ${esc(scene.short)}</a><span>/</span><span>${esc(node.title)}</span></div>
      <section class="section-hero inside-hero"><span class="eyebrow">INSIDE THE CONCEPT · ${esc(profile.kind)}</span><h1>${esc(profile.title)}</h1><p>${esc(profile.intro)}</p></section>
      <section class="anatomy" aria-label="Interactive concept anatomy">
        <div class="anatomy-heading"><div><span class="eyebrow">01 / COMPOSITION</span><h2>What is inside?</h2></div><span>Select a part to inspect its implementation</span></div>
        <div class="anatomy-body"><div class="anatomy-diagram"><div class="anatomy-root"><span class="tiny-dot"></span><strong>${esc(profile.title)}</strong><small>A map of collaborating parts</small></div><div class="anatomy-parts">${profile.parts.map((item, i) => `<a class="anatomy-part ${i === selected ? 'selected' : ''}" href="${route(i)}" ${i === selected ? 'aria-current="true"' : ''}><span class="inside-number">0${i + 1}</span><span><strong>${esc(item.name)}</strong><small>${esc(item.role)}</small></span><span aria-hidden="true">↗</span></a>`).join('')}</div><p class="anatomy-caption">${esc(profile.assembly)}</p></div>
        <aside class="anatomy-detail" aria-label="Selected internal part"><span class="eyebrow">PART 0${selected + 1} / 0${profile.parts.length}</span><h2>${esc(part.name)}</h2><p>${esc(part.body)}</p><div class="anatomy-source-heading"><span>IMPLEMENTATION EXCERPT</span><span>${esc(source.name)}:${source.line}</span></div><pre class="anatomy-code" tabindex="0" aria-label="Implementation excerpt">${source.excerpt.map((line, i) => `<span><span class="ln">${source.line + i}</span>${esc(line) || ' '}</span>`).join('')}</pre><div class="anatomy-actions"><button class="inside-open" data-source="${part.source}" data-line="${source.line}">Read the full implementation ↗</button>${pkg ? `<a href="${esc(packageRoute(pkg))}">Locate in the package map →</a>` : ''}</div></aside></div>
      </section>
      <section class="inside-execution"><span class="eyebrow">02 / EXECUTION</span><h2>How the pieces work together</h2><div class="inside-flow">${profile.flow.map((item, i) => `<a href="${route(item.part)}" class="inside-flow-step ${item.part === selected ? 'selected' : ''}"><span class="flow-phase">${i + 1}<span aria-hidden="true">→</span></span><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p><small>Inspect ${esc(profile.parts[item.part].name)} ↗</small></a>`).join('')}</div><div class="inside-rule"><span>THE LIFECYCLE RULE</span><p>${esc(profile.rule)}</p></div></section>
      <section class="inside-locations"><span class="eyebrow">03 / CODE ORGANIZATION</span><h2>Where it lives</h2><p>Follow a package into the dependency map, or open a source file right here.</p><div class="inside-packages">${packages.map((item) => `<article><a href="${esc(packageRoute(item))}"><small>${esc(item.module)} · ${item.language === 'java' ? 'Java package' : 'Source folder'}</small><strong>${esc(item.name)}</strong><span>Explore package & dependencies →</span></a><div>${[...new Set(profile.parts.filter((p) => packageFor(p.source)?.id === item.id).map((p) => p.source))].map((key) => `<button data-source="${key}">${esc(snapshot.sources[key].name)} ↗</button>`).join('')}</div></article>`).join('')}</div></section>
      <section class="inside-related"><span class="eyebrow">KEEP EXPLORING THIS JOURNEY</span><div>${related.map((item) => `<a href="${link(scene.id, item.id, 0, step, lens)}">${esc(item.title)} <span>→</span></a>`).join('')}</div></section>`;
    return profile.title;
  }
  const index = Object.entries(profiles).map(([id, profile]) => {
    const [scene, nodes] = Object.entries(mappings).find(([, entries]) => Object.values(entries).includes(id));
    const node = Object.keys(nodes).find((key) => nodes[key] === id);
    return {
      type: 'INTERNALS',
      title: profile.title,
      description: 'Objects, execution & package locations',
      text: profile.assembly + ' ' + profile.parts.map((p) => p.name + ' ' + p.body).join(' '),
      route: link(scene, node)
    };
  });
  window.FLOW_INTERNALS = { get, anchor, link, preview, render, index };
})();
