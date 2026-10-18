# Pour Decisions

A phone web app for a group of friends: plain HTML, CSS and JavaScript modules with no build step, Firebase (Auth and Firestore) for data, hosted on GitHub Pages. The README has the features, data layout and changelog.

## The owner works from the Claude phone app

Everything must be doable through commits, pull requests and merges. Never hand the owner a step that needs a computer, a terminal or the Firebase console (no "run `npm run deploy:rules`", no "paste the rules into the console"). If something truly can't be done from here, say so and propose a way to automate it.

## Deploying: merging into `main` does everything

The **Deploy** GitHub Action (`.github/workflows/deploy.yml`) runs on every push to `main`, in this order:

1. **test**: `npm test` and `npm run test:rules` (Firestore emulator).
2. **rules**: publishes `firestore.rules` to Firebase (`pourdecisions-910bf`), only if `firestore.rules` or `firebase.json` changed. Uses the `FIREBASE_SERVICE_ACCOUNT` repository secret.
3. **pages**: deploys the app to GitHub Pages (Pages source is "GitHub Actions", not a branch).

A failure stops the later steps, so the app never goes live before the rules it needs. Pull requests run the tests only. **Actions > Deploy > Run workflow** publishes the rules (changed or not) and the app again.

After merging, check the Deploy run on `main` (all three jobs green) before saying a change is live. A red run means nothing after the failed step went out.

## Rules changes

Phones keep running the previous app version for hours after a deploy, so new rules must still accept what the previous version writes. Adding optional fields or collections is fine; removing or tightening something needs a release that stops using it first. Add or update a test in `tests/rules/` for every rules change.

## Conventions

- Bump `VERSION` in `js/config.js` for app changes (major / minor for a feature / patch for a fix), and update the README's **Current version** and changelog in the same commit. Say in the changelog entry when `firestore.rules` changed. Workflow-only or docs-only changes don't need a version bump.
- A new file under `js/` goes in `APP_FILES` in `sw.js`, or the app won't have it offline.
- Run `npm test` before pushing, and `npm run test:rules` when `firestore.rules` changed (it needs Java 21).
