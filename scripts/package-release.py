"""Create reviewed source/static archives. This optional packaging tool needs Python 3.
Normal development/build/Studio only need Node/npm.
"""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
from datetime import datetime, timezone

root = Path(__file__).resolve().parents[1]
output = root / 'releases'
output.mkdir(exist_ok=True)
version = json.loads((root / 'package.json').read_text())['version']
folders = ['.github', 'art', 'content', 'docs', 'generated', 'public', 'scripts', 'src', 'studio']
files = ['.env.example', '.gitignore', '.nvmrc', 'AGENTS.md', 'LICENSE', 'NOTICE.md',
         'README.md', 'README.original.md', 'index.html', 'package.json',
         'package-lock.json', 'tsconfig.json', 'vercel.json', 'vite.config.ts']
source = [root / file for file in files]
for folder in folders:
    source.extend(path for path in (root / folder).rglob('*') if path.is_file())
source = sorted(path for path in source if not path.is_symlink() and path.name != '.DS_Store'
                and not any(part in ['node_modules', '.git', '.studio', 'imports'] for part in path.relative_to(root).parts)
                and (not path.name.startswith('.env') or path.name == '.env.example'))
static = sorted(path for path in (root / 'dist').rglob('*') if path.is_file() and not path.is_symlink())
if not (root / 'dist/index.html').exists():
    raise RuntimeError('Run npm run build first')

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

artifacts = []
for kind, paths, base in [('source', source, root), ('static', static, root / 'dist')]:
    target = output / ('MimaGlows_Personal_Archive_v5_' + kind + '.zip')
    with ZipFile(target, 'w', ZIP_DEFLATED, compresslevel=9) as archive:
        for file in paths:
            archive.write(file, file.relative_to(base).as_posix())
    with ZipFile(target) as archive:
        if archive.testzip() is not None:
            raise RuntimeError('Archive CRC verification failed')
        if any(name.startswith('/') or '..' in Path(name).parts for name in archive.namelist()):
            raise RuntimeError('Unsafe archive paths')
    artifacts.append({'file': target.name, 'bytes': target.stat().st_size, 'sha256': digest(target), 'files': len(paths)})

manifest = {'version': version, 'createdAt': datetime.now(timezone.utc).isoformat(), 'artifacts': artifacts,
            'staticFiles': [{'file': p.relative_to(root / 'dist').as_posix(), 'bytes': p.stat().st_size, 'sha256': digest(p)} for p in static],
            'excludedFromSource': ['node_modules', 'dist', '.git', '.openai', '.studio', 'imports', '.env.local', 'releases']}
(output / 'manifest-v5.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(artifacts, indent=2))
