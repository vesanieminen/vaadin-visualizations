#!/usr/bin/env python3
# Copyright 2026 Vaadin Ltd. Licensed under the Apache License, Version 2.0.
"""Bundle commit-pinned Flow source and Maven metadata for the offline explorer."""
import json
import posixpath
import subprocess
from pathlib import Path
from xml.etree import ElementTree

from build_atlas import build_atlas

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
NS = {'m': 'http://maven.apache.org/POM/4.0.0'}


def read_git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args], text=True)


def build_snapshot():
    commit = read_git('rev-parse', 'HEAD').strip()
    paths = read_git('ls-tree', '-r', '--name-only', commit).splitlines()
    # Markers are deliberately checked: a renamed method must not silently
    # produce a plausible-looking source link to unrelated code.
    specs = {
        'element': ('dom/Element.java', 'public Element setText('),
        'component': ('component/Component.java', 'public Element getElement()'),
        'ui': ('component/UI.java', 'public Future<Void> access('),
        'internals': ('component/internal/UIInternals.java', 'public StateTree getStateTree()'),
        'state': ('internal/StateTree.java', 'public void collectChanges('),
        'node': ('internal/StateNode.java', 'public void markAsDirty()'),
        'session': ('server/VaadinSession.java', 'public void unlock()'),
        'service': ('server/VaadinService.java', 'public void handleRequest('),
        'servlet': ('server/VaadinServlet.java', 'protected void service('),
        'request': ('communication/UidlRequestHandler.java', 'getRpcHandler().handleRpc('),
        'rpc': ('communication/ServerRpcHandler.java', 'private void handleInvocations('),
        'event': ('communication/rpc/EventRpcHandler.java', 'public Optional<Runnable> handleNode('),
        'sync': ('communication/rpc/MapSyncRpcHandler.java', 'protected Optional<Runnable> handleNode('),
        'writer': ('communication/UidlWriter.java', 'public ObjectNode createUidl('),
        'encode': ('communication/UidlWriter.java', 'private void encodeChanges('),
        'router': ('router/Router.java', 'public int navigate(UI ui, Location location, NavigationTrigger trigger) '),
        'navigation': ('router/internal/AbstractNavigationStateRenderer.java', 'Optional<Integer> result = handleBeforeLeaveEvents('),
        'instantiator': ('di/Instantiator.java', 'default <T extends HasElement> T createRouteTarget('),
        'bootstrap': ('communication/JavaScriptBootstrapHandler.java', 'public class JavaScriptBootstrapHandler'),
        'push': ('server/communication/AtmospherePushConnection.java', 'public void push('),
        'binder': ('data/binder/Binder.java', 'private BinderValidationStatus<BEAN> doWriteIfValid('),
        'data': ('data/provider/DataCommunicator.java', 'protected Stream<T> fetchFromProvider('),
        'provider': ('data/provider/DataProvider.java', 'Stream<T> fetch('),
        'clientTree': ('client/flow/StateTree.ts', 'sendEventToServer(node:'),
        'connector': ('client/communication/ServerConnector.ts', 'sendEventMessage('),
        'queue': ('client/communication/ServerRpcQueue.ts', 'class ServerRpcQueue'),
        'sender': ('client/communication/MessageSender.ts', 'sendInvocationsToServer():'),
        'message': ('client/communication/MessageHandler.ts', 'protected handleJSON('),
        'changes': ('client/flow/TreeChangeProcessor.ts', 'export function processChanges('),
        'binding': ('client/flow/binding/SimpleElementBindingStrategy.ts', 'function handleDomEvent('),
        'execute': ('client/flow/ExecuteJavaScriptProcessor.ts', 'class ExecuteJavaScriptProcessor'),
        'prepare': ('plugin/maven/PrepareFrontendMojo.java', 'BuildFrontendUtil.prepareFrontend(this)'),
        'build': ('plugin/maven/BuildFrontendMojo.java', 'protected void executeInternal()'),
        'tasks': ('frontend/NodeTasks.java', 'public class NodeTasks'),
        'scanner': ('frontend/scanner/FrontendDependencies.java', 'public class FrontendDependencies'),
        'imports': ('frontend/TaskUpdateImports.java', 'class TaskUpdateImports'),
        'architecture': ('guidelines/architecture.md', '## State management'),
        'protocol': ('guidelines/wire-protocol.md', '## The UIDL response'),
        'spring': ('spring/SpringInstantiator.java', 'public class SpringInstantiator'),
        'cdi': ('cdi/CdiInstantiator.java', 'public class CdiInstantiator'),
        'quarkus': ('quarkus/QuarkusInstantiator.java', 'public class QuarkusInstantiator'),
        'signal': ('signals/local/ValueSignal.java', 'public class ValueSignal'),
        'repository': ('guidelines/repository.md', '## Module structure'),
    }
    sources, files = {}, {}
    for key, (suffix, marker) in specs.items():
        candidates = [p for p in paths if p.endswith(suffix) and ('/src/main/' in p or p.startswith('guidelines/'))]
        if len(candidates) != 1:
            raise ValueError(f'{key}: expected one source for {suffix}, got {candidates}')
        path = candidates[0]
        content = read_git('show', f'{commit}:{path}')
        lines = content.splitlines()
        matches = [i for i, line in enumerate(lines) if marker in line]
        if not matches:
            raise ValueError(f'{key}: marker not found: {marker}')
        line = matches[0] + 1
        files[path] = content
        sources[key] = {'path': path, 'line': line, 'end': min(line + 37, len(lines)),
                        'name': Path(path).name, 'module': path.split('/')[0]}
    # Read direct dependency declarations, excluding dependencyManagement and
    # profile activation. Aggregate nested modules into their top-level family.
    top = ElementTree.fromstring(read_git('show', f'{commit}:pom.xml'))
    names = [n.text for n in top.findall('m:modules/m:module', NS)] + ['flow-tests']
    artifacts = {}
    poms = {}
    pending = [name + '/pom.xml' for name in names]
    while pending:
        path = pending.pop()
        if path in poms:
            continue
        doc = ElementTree.fromstring(read_git('show', f'{commit}:{path}'))
        aid = doc.find('m:artifactId', NS)
        if aid is not None:
            artifacts[aid.text] = path.split('/')[0]
        poms[path] = doc
        children = doc.findall('m:modules/m:module', NS) + doc.findall('m:profiles/m:profile/m:modules/m:module', NS)
        for child in children:
            relative = child.text if child.text.endswith('.xml') else child.text + '/pom.xml'
            pending.append(posixpath.normpath(str(Path(path).parent / relative)))
    modules = []
    for name in names:
        deps = set()
        for path, doc in poms.items():
            if path.split('/')[0] == name:
                for dep in doc.findall('m:dependencies/m:dependency', NS):
                    aid = dep.find('m:artifactId', NS)
                    group = dep.find('m:groupId', NS)
                    target = artifacts.get(aid.text) if aid is not None else None
                    if group is not None and group.text == 'com.vaadin' and target and target != name:
                        deps.add(target)
        count = sum(1 for p in paths if p.startswith(name + '/') and '/src/main/' in p and p.endswith(('.java', '.ts', '.js')))
        modules.append({'id': name, 'dependencies': sorted(deps), 'sourceCount': count})
    snapshot = {'commit': commit, 'date': read_git('show', '-s', '--format=%cs', commit).strip(),
                'version': top.find('m:version', NS).text, 'repo': 'https://github.com/vaadin/flow',
                'sources': sources, 'files': files, 'modules': modules,
                'atlas': build_atlas(ROOT, commit, paths, modules, poms, artifacts, NS)}
    (HERE / 'snapshot.js').write_text('/* Generated by build_snapshot.py; source files retain their Apache-2.0 notices. */\nwindow.FLOW_SNAPSHOT = ' + json.dumps(snapshot, ensure_ascii=False) + ';\n')
    print(f"Atlas: {len(snapshot['atlas']['packages'])} packages/folders, {len(snapshot['atlas']['imports'])} import edges")
    print(f'Bundled {len(files)} files, {len(sources)} entry points, {len(modules)} module families at {commit[:10]}')


if __name__ == '__main__':
    build_snapshot()
