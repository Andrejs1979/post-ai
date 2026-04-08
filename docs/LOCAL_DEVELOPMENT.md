# Local Development Setup

## Prerequisites

This project depends on the **galactic-platform** repository. You must have it cloned at the same level as this project:

```
~/workspace/
├── galactic-platform/     # Required dependency
│   └── packages/
│       ├── errors/
│       ├── validation/
│       ├── data/
│       └── testing/
└── post-ai/               # This repository
    └── worker/
```

## Dependency Resolution

The worker package uses file-based dependencies to the galactic-platform packages:

```json
"@g-a-l-a-c-t-i-c/errors": "file:../../galactic-platform/packages/errors",
"@g-a-l-a-c-t-i-c/validation": "file:../../galactic-platform/packages/validation",
"@g-a-l-a-c-t-i-c/data": "file:../../galactic-platform/packages/data"
```

These will not resolve unless the galactic-platform repo exists at the expected relative path.

## Alternative: Using the Private Registry

If you have access to the `@g-a-l-a-c-t-i-c` GitHub Package Registry:

1. Configure authentication in `~/.npmrc`:
   ```
   @g-a-l-a-c-t-i-c:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
   ```

2. Update package.json to use registry versions instead of file paths:
   ```json
   "@g-a-l-a-c-t-i-c/errors": "^1.0.0",
   "@g-a-l-a-c-t-i-c/validation": "^1.0.0",
   "@g-a-l-a-c-t-i-c/data": "^1.0.0"
   ```

## Installation

```bash
# 1. Ensure galactic-platform is cloned at ../../galactic-platform

# 2. Install worker dependencies
cd worker
npm install

# 3. Run tests
npm test

# 4. Deploy
wrangler deploy
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design details.
