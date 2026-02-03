# CI/CD Pipeline Documentation

## Overview

The project uses GitHub Actions for continuous integration and deployment.

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main` and `develop` branches.

#### Job: `test`

Validates code quality and functionality:

1. **Checkout** - Get source code
2. **Setup** - Install pnpm, Node.js 20
3. **Install dependencies** - `pnpm install --frozen-lockfile`
4. **Lint** - Check code style with ESLint
5. **Type check** - Verify TypeScript types
6. **Unit tests** - Run Vitest tests
7. **E2E tests** - Run Playwright tests
8. **Build** - Create production build
9. **Verify build output** - Check that all critical files exist:
   - `index.html`
   - `manifest.webmanifest`
   - `sw.js` (service worker)
   - Assets directory
   - PWA icons
10. **Upload artifacts** - Store dist folder for 7 days

#### Job: `docker`

Tests Docker containerization (runs after `test` job):

1. **Checkout** - Get source code
2. **Setup Docker Buildx** - Enable advanced Docker features
3. **Build Docker image** - Create production container
   - Uses layer caching for faster builds
   - Tags as `loyalty-card-vault:test`
4. **Test Docker image**:
   - Start container on port 8080
   - Test health endpoint (`/health`)
   - Test main page (`/`)
   - Verify HTML response
5. **Check image size**:
   - Display image size
   - Warn if >50MB (expected: ~25MB)

### 2. Deploy Workflow (`.github/workflows/deploy.yml`)

Runs on every push to `main` branch and manual trigger.

#### Job: `build`

1. **Checkout** - Get source code
2. **Setup** - Install pnpm, Node.js 20
3. **Install dependencies**
4. **Semantic Release** - Auto-version and create GitHub release
   - Analyzes commit messages (conventional commits)
   - Updates `package.json` version
   - Generates `CHANGELOG.md`
   - Creates git tag and GitHub release
5. **Lint** - Validate code
6. **Build** - Create production build with updated version
7. **Upload to GitHub Pages** - Prepare for deployment

#### Job: `deploy`

1. **Deploy to GitHub Pages** - Publish to production

## Semantic Release

### Commit Message Format

Uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]

[optional footer]
```

### Types and Version Bumps

| Type | Description | Version Bump | Example |
|------|-------------|--------------|---------|
| `feat:` | New feature | Minor (0.1.0) | `feat: add QR code scanner` |
| `fix:` | Bug fix | Patch (0.0.1) | `fix: resolve sticky nav on mobile` |
| `perf:` | Performance improvement | Patch (0.0.1) | `perf: optimize barcode rendering` |
| `refactor:` | Code refactoring | Patch (0.0.1) | `refactor: simplify color picker logic` |
| `docs:` | Documentation only | No release | `docs: update README` |
| `test:` | Add/modify tests | No release | `test: add ColorPicker tests` |
| `chore:` | Maintenance tasks | No release | `chore: update dependencies` |
| `BREAKING CHANGE:` | Breaking API change | Major (1.0.0) | `feat!: redesign card storage API` |

### Examples

```bash
# Patch release (0.0.1)
git commit -m "fix: bottom navigation sticky on iOS"

# Minor release (0.1.0)
git commit -m "feat: add PWA install prompt banner"

# Major release (1.0.0)
git commit -m "feat!: migrate to new encryption algorithm

BREAKING CHANGE: All existing cards must be re-encrypted"
```

## Build Verification

The CI pipeline verifies:

✅ Code passes linting (ESLint)
✅ Types are valid (TypeScript)
✅ All tests pass (Vitest + Playwright)
✅ Production build succeeds
✅ Critical files are generated
✅ PWA assets are present
✅ Docker image builds successfully
✅ Docker container runs and responds
✅ Image size is optimal (<50MB)

## Caching Strategy

### pnpm Dependencies
- Cached by GitHub Actions
- Cache key based on `pnpm-lock.yaml`

### Docker Layers
- Uses GitHub Actions cache
- Significantly speeds up Docker builds
- Cache mode: `max` (cache all layers)

## Artifacts

### Build Artifacts (`dist/`)
- Retention: 7 days
- Contains production build
- Can be downloaded from Actions tab

### Playwright Reports
- Retention: 30 days
- Contains E2E test results
- Uploaded on test failure

## Environment Variables

### CI Workflow
- No secrets required

### Deploy Workflow
- `GITHUB_TOKEN` - Auto-provided by GitHub
- `NPM_TOKEN` - Not required (npm publish disabled)

## Troubleshooting

### Build Fails
1. Check lint errors
2. Verify TypeScript types
3. Review test failures
4. Inspect build logs

### Docker Build Fails
1. Verify Dockerfile syntax
2. Check that all source files exist
3. Review pnpm install output
4. Test locally: `docker build -t test .`

### Semantic Release Issues
1. Verify commit message format
2. Check that commits follow conventional commits
3. Ensure `GITHUB_TOKEN` has write permissions
4. Review semantic-release logs

## Local Testing

### Test CI locally

```bash
# Install dependencies
pnpm install

# Run linting
pnpm lint

# Run type check
pnpm tsc -b

# Run tests
pnpm test

# Build
pnpm build

# Verify build output
ls -la dist/
```

### Test Docker locally

```bash
# Build image
docker build -t loyalty-card-vault:test .

# Run container
docker run -d --name test -p 8080:80 loyalty-card-vault:test

# Test health endpoint
curl http://localhost:8080/health

# Test main page
curl http://localhost:8080/

# Cleanup
docker stop test && docker rm test
```

## Performance

### CI Pipeline Duration
- `test` job: ~3-5 minutes
- `docker` job: ~2-3 minutes
- **Total**: ~5-8 minutes

### Optimizations
- Parallel job execution
- Dependency caching (pnpm)
- Docker layer caching
- Only run Docker build after tests pass
