# Copyright 2026 Vaadin Ltd. Licensed under the Apache License, Version 2.0.
"""Extract navigable package and import evidence from one immutable Git revision."""
import collections
import json
import posixpath
import re
import subprocess


def read_sources(root, commit, paths):
    """Read blobs in one Git process rather than invoking Git for every class."""
    request = ''.join(f'{commit}:{path}\n' for path in paths).encode()
    result = subprocess.run(['git', '-C', str(root), 'cat-file', '--batch'], input=request,
                            stdout=subprocess.PIPE, check=True).stdout
    cursor = 0
    sources = {}
    for path in paths:
        header_end = result.index(b'\n', cursor)
        size = int(result[cursor:header_end].split()[-1])
        cursor = header_end + 1
        sources[path] = result[cursor:cursor + size].decode('utf-8')
        cursor += size + 1
    return sources


def blank_java_literals(text):
    pattern = r'"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|/\*[\s\S]*?\*/|//[^\n]*'
    return re.sub(pattern, lambda match: re.sub(r'[^\n]', ' ', match[0]), text)


def build_atlas(root, commit, paths, modules, poms, artifacts, ns):
    names = {module['id'] for module in modules}
    source_paths = sorted(path for path in paths if path.split('/')[0] in names
                          and '/src/main/' in path and path.endswith(('.java', '.ts', '.js')))
    texts = read_sources(root, commit, source_paths)
    packages, file_index, class_index = {}, {}, collections.defaultdict(list)
    java_texts = {}
    for path, text in texts.items():
        module = path.split('/')[0]
        if path.endswith('.java'):
            clean = blank_java_literals(text)
            java_texts[path] = clean
            declaration = re.search(r'^\s*package\s+([\w.]+)\s*;', clean, re.M)
            name = declaration[1] if declaration else '(default package)'
            language = 'java'
            type_name = posixpath.basename(path)[:-5]
            if declaration:
                class_index[name + '.' + type_name].append(path)
        else:
            name = posixpath.dirname(path.split('/src/main/', 1)[1]) or '(root)'
            language = 'web'
        key = module + '::' + language + ':' + name
        file_index[path] = key
        package = packages.setdefault(key, {'id': key, 'module': module, 'name': name,
                                           'language': language, 'files': []})
        package['files'].append(path)
    edges = {}
    ambiguous = 0
    resolved_imports = 0

    def add_reference(path, target_package, target_path, match, specifier, kind):
        nonlocal resolved_imports
        source_package = file_index[path]
        resolved_imports += 1
        # Intra-package imports are not edges in a package dependency map.
        if source_package == target_package:
            return
        edge = edges.setdefault((source_package, target_package), {
            'from': source_package, 'to': target_package, 'count': 0, 'evidence': []})
        edge['count'] += 1
        if len(edge['evidence']) < 3:
            line = texts[path].count('\n', 0, match.start()) + 1
            edge['evidence'].append({'path': path, 'line': line, 'target': target_path,
                                     'import': specifier, 'kind': kind})

    for path in source_paths:
        if path.endswith('.java'):
            for match in re.finditer(r'^[ \t]*import\s+(?:static\s+)?([\w.]+(?:\*)?)\s*;', java_texts[path], re.M):
                specifier = match[1]
                stem = specifier.removesuffix('.*')
                targets = []
                while '.' in stem:
                    if stem in class_index:
                        targets = class_index[stem]
                        break
                    stem = stem.rsplit('.', 1)[0]
                if len(targets) > 1:
                    local = [target for target in targets if target.split('/')[0] == path.split('/')[0]]
                    targets = local if len(local) == 1 else []
                    if not targets:
                        ambiguous += 1
                if len(targets) == 1:
                    add_reference(path, file_index[targets[0]], targets[0], match, specifier, 'java import')
                elif specifier.endswith('.*'):
                    target_name = specifier[:-2]
                    candidates = [package for package in packages.values()
                                  if package['language'] == 'java' and package['name'] == target_name]
                    if len(candidates) == 1:
                        add_reference(path, candidates[0]['id'], None, match, specifier, 'wildcard import')
        else:
            # Static ESM imports/exports. Comments are replaced without changing
            # offsets; bare npm imports and dynamic imports are intentionally excluded.
            clean = re.sub(r'/\*[\s\S]*?\*/|^\s*//[^\n]*',
                           lambda match: re.sub(r'[^\n]', ' ', match[0]), texts[path], flags=re.M)
            pattern = r'''^[ \t]*(?:import[ \t]+(?:(?:type[ \t]+)?[\w*$,{][^;]*?\s+from\s+)?|export[ \t]+(?:type[ \t]+)?(?:\*|\{)[^;]*?\s+from\s+)["'](\.[^"']+)["']'''
            for match in re.finditer(pattern, clean, re.M):
                base = posixpath.normpath(posixpath.join(posixpath.dirname(path), match[1]))
                candidates = [base, base + '.ts', base + '.js', base + '/index.ts', base + '/index.js']
                if base.endswith('.js'):
                    candidates.append(base[:-3] + '.ts')
                target = next((candidate for candidate in candidates if candidate in file_index), None)
                if target:
                    add_reference(path, file_index[target], target, match, match[1], 'relative ESM import')

    maven = {}
    for path, doc in sorted(poms.items()):
        origin = path.split('/')[0]
        for dep in doc.findall('m:dependencies/m:dependency', ns):
            artifact = dep.findtext('m:artifactId', '', ns)
            target = artifacts.get(artifact)
            if dep.findtext('m:groupId', '', ns) != 'com.vaadin' or not target or target == origin:
                continue
            scope = dep.findtext('m:scope', 'compile', ns)
            edge = maven.setdefault((origin, target), {'from': origin, 'to': target, 'declarations': []})
            evidence = {'pom': path, 'scope': scope, 'artifact': artifact,
                        'optional': dep.findtext('m:optional', 'false', ns) == 'true'}
            if evidence not in edge['declarations']:
                edge['declarations'].append(evidence)
    return {'packages': sorted(packages.values(), key=lambda package: package['id']),
            'imports': sorted(edges.values(), key=lambda edge: (edge['from'], edge['to'])),
            'maven': sorted(maven.values(), key=lambda edge: (edge['from'], edge['to'])),
            'sourceFiles': len(source_paths), 'resolvedImports': resolved_imports,
            'ambiguousImportsSkipped': ambiguous}
