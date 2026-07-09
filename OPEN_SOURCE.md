# Open Source Note

Boardly is **free and open source software**, released under the [MIT License](./LICENSE). It is built in the open, and it always will be.

## What this means for you

- ✅ **Free to use** — personal, commercial, internal, or as part of a larger product.
- ✅ **Free to modify** — fork it, adapt it, wire it into your own workflows.
- ✅ **Free to redistribute** — subject only to keeping the MIT copyright and license notice.
- ✅ **No lock-in** — it's a self-contained GitHub Action driven by a plain YAML file you own.

There is no paid tier, no telemetry, and no "open core" bait-and-switch. The version you see here is the whole thing.

## Our principles

- **Transparency.** Every automated action is recorded in the run's [audit trail](./README.md#-features). The bot never does anything you can't see.
- **Least privilege.** The action only ever uses the token *you* provide, with the scopes *you* grant. See [SECURITY.md](./SECURITY.md).
- **Community first.** Roadmap and design happen in public issues. See [ROADMAP.md](./ROADMAP.md) and [CONTRIBUTING.md](./CONTRIBUTING.md).

## Sustainability

Open source takes real time to maintain. If this project helps your team, you can keep it healthy by:

- ⭐ **Starring** the repository (helps others discover it)
- 🐛 **Reporting bugs** and 📝 **improving docs**
- 💬 **Sharing** how you use it (great [use-cases](./docs/use-cases) come from real teams)
- ❤️ **Sponsoring** — see [Support the project](./README.md#-support-the-project)

## Third-party dependencies

This project stands on other open-source work, including:

- [`@actions/core`](https://github.com/actions/toolkit) & [`@actions/github`](https://github.com/actions/toolkit) (MIT)
- [`@octokit/graphql`](https://github.com/octokit/graphql.js) (MIT)
- [`js-yaml`](https://github.com/nodeca/js-yaml) (MIT)
- [`zod`](https://github.com/colinhacks/zod) (MIT)

Full dependency license texts are bundled in [`dist/licenses.txt`](./dist/licenses.txt) at build time. Thank you to all their maintainers. 🙏
