## [1.5.0](https://github.com/maxgfr/loyalty-card-vault/compare/v1.4.0...v1.5.0) (2026-02-07)

### Features

* enhance layout with safe area insets for edge-to-edge devices across multiple components ([706280e](https://github.com/maxgfr/loyalty-card-vault/commit/706280ea7d4c77f5d47633b03377614ac14742fe))

## [1.4.0](https://github.com/maxgfr/loyalty-card-vault/compare/v1.3.0...v1.4.0) (2026-02-04)

### Features

* sync selectedCamera with active device during scanning; improve camera handling on mobile ([95401de](https://github.com/maxgfr/loyalty-card-vault/commit/95401de60e863fc52965f99f2460821f67eef0c3))

## [1.3.0](https://github.com/maxgfr/loyalty-card-vault/compare/v1.2.0...v1.3.0) (2026-02-04)

### Features

* move installation prompt to help section in SettingsPage; improve user experience ([ea47e9f](https://github.com/maxgfr/loyalty-card-vault/commit/ea47e9fe53b6399b2d3ae56a02a81f35a56dcdf4))

## [1.2.0](https://github.com/maxgfr/loyalty-card-vault/compare/v1.1.0...v1.2.0) (2026-02-04)

### Features

* add loading state and spinner to Button component; implement app update functionality in SettingsPage ([221be3f](https://github.com/maxgfr/loyalty-card-vault/commit/221be3ff72da03b202cecf9a1d5b4607c679b6f0))
* improve camera selection logic for BarcodeScanner; enhance error handling during scanning ([ac5df62](https://github.com/maxgfr/loyalty-card-vault/commit/ac5df6266d85d9a459c0acc00e24833c55a4ac1c))

## [1.1.0](https://github.com/maxgfr/loyalty-card-vault/compare/v1.0.1...v1.1.0) (2026-02-04)

### Features

* update build process and enhance PWA asset generation with background color ([40ab523](https://github.com/maxgfr/loyalty-card-vault/commit/40ab523d8e6f8f8b958f3b85909238eb121839f8))

## [1.0.1](https://github.com/maxgfr/loyalty-card-vault/compare/v1.0.0...v1.0.1) (2026-02-04)

### Bug Fixes

* Update CI workflow to enable Docker image loading ([8858a43](https://github.com/maxgfr/loyalty-card-vault/commit/8858a4372022c401209834237fd55217e26ccaae))

## 1.0.0 (2026-02-03)

### Features

* add CLAUDE.md for project documentation and development guidance ([37c98c2](https://github.com/maxgfr/loyalty-card-vault/commit/37c98c2915ee0f0bc78e5fc7fd231c58c0497799))
* add compact mode to ColorPicker and enhance TagInput with suggestion navigation ([f6a0985](https://github.com/maxgfr/loyalty-card-vault/commit/f6a09857dc4ea03cd2bd374f02ca38c175746a97))
* add help page with installation guide and usage instructions ([73dcdb4](https://github.com/maxgfr/loyalty-card-vault/commit/73dcdb44bac75d984227603ec9d5fdfc69c53a44))
* add share-url system foundation ([20d3218](https://github.com/maxgfr/loyalty-card-vault/commit/20d3218b99b7077616293fd7981db468287ceee2))
* add smart features, validation, camera selection, and tests ([07c3b02](https://github.com/maxgfr/loyalty-card-vault/commit/07c3b028a558a78b9ab9e86e8997f1112fb3bb13))
* enhance card item styles with backdrop filter and transform properties ([e7f3c9b](https://github.com/maxgfr/loyalty-card-vault/commit/e7f3c9b290f5040de038bbd892eb842799b8f36d))
* enhance CardForm with color and tag inputs, and implement auto-suggestions for tags based on store name ([be272a0](https://github.com/maxgfr/loyalty-card-vault/commit/be272a0bf408bd1e0ff12bb1fe56dd82baf924aa))
* enhance ColorPicker with grouped color presets and improved styles ([aac81a6](https://github.com/maxgfr/loyalty-card-vault/commit/aac81a6e237f9e83925ff34bab222f287b537d55))
* implement app foundation and infrastructure ([31bab31](https://github.com/maxgfr/loyalty-card-vault/commit/31bab31c4d3e099421c1a28ff1e2ff63ba716b9d))
* implement complete loyalty card vault app ([69d638c](https://github.com/maxgfr/loyalty-card-vault/commit/69d638cb54bee328d78b19915672f0bdf274aefc))
* implement install banner for PWA installation prompts and enhance mobile compatibility ([efdf6b2](https://github.com/maxgfr/loyalty-card-vault/commit/efdf6b22606541103fefd724f50c87542bf93501))
* implement peer-to-peer device synchronization ([2f3dd75](https://github.com/maxgfr/loyalty-card-vault/commit/2f3dd75ff5dcde5fd7275c4b8b32b04eb4b10714))
* implement sharing functionality for loyalty cards ([bf601ce](https://github.com/maxgfr/loyalty-card-vault/commit/bf601cea22ef8db7d5bd077ddf98f5ac291316a0))
* improve code quality and consistency by refactoring error handling, updating dependencies, and enhancing barcode validation ([03f2666](https://github.com/maxgfr/loyalty-card-vault/commit/03f2666136934223b1cd17413746e5fef9e10543))
* update app icons and splash screens for better branding ([244587c](https://github.com/maxgfr/loyalty-card-vault/commit/244587c837356859a284f74ea45520c06dbb1ebc))

### Bug Fixes

* create new Uint8Array for Web Crypto API compatibility ([8573327](https://github.com/maxgfr/loyalty-card-vault/commit/85733271fb5af17e2e473209adb3552ba145291a))
* disable eslint ban-ts-comment for crypto type workaround ([cac7967](https://github.com/maxgfr/loyalty-card-vault/commit/cac7967665ea906331a31958bafcdbee058b3d5d))
* explicitly copy bytes to new ArrayBuffer for crypto ops ([3794809](https://github.com/maxgfr/loyalty-card-vault/commit/379480991f7377a390237204d03066f55ff02505))
* force encryption, fix headers width, fix backup import, improve share ([30b1dc4](https://github.com/maxgfr/loyalty-card-vault/commit/30b1dc46ed72c5a0b0548d7bb5a4444e378b3f67))
* improve PWA on iOS and enhance scanner UX ([4360c19](https://github.com/maxgfr/loyalty-card-vault/commit/4360c196812fc4910da93f4f6798b1e8eec64ed3)), closes [#6366f1](https://github.com/maxgfr/loyalty-card-vault/issues/6366f1)
* multiple bug fixes and improvements, add comprehensive unit tests ([d27e7c1](https://github.com/maxgfr/loyalty-card-vault/commit/d27e7c19073b2ccb5de2aafe2343111f48f92161))
* redesign CardList header to be consistent and full-width ([0374f1b](https://github.com/maxgfr/loyalty-card-vault/commit/0374f1b076593ecf4ce8694e68597680fab199c9))
* resolve crypto type errors and force cache clear on reset ([0d86c7d](https://github.com/maxgfr/loyalty-card-vault/commit/0d86c7dcfda6ca845751506602595da3330c6c2d))
* revert to original crypto implementation with ts-ignore ([0a24a7f](https://github.com/maxgfr/loyalty-card-vault/commit/0a24a7f61031f52090ffb68d6aedd7bfd8338916))
* skip crypto tests in CI due to jsdom limitations ([bbf74df](https://github.com/maxgfr/loyalty-card-vault/commit/bbf74df2f761edf7590957b2ba3430fc59c154c4))
* suppress normal scanning errors in barcode scanner ([df568b5](https://github.com/maxgfr/loyalty-card-vault/commit/df568b5d16d5d1aa197951f647c2b9e49d594f2b))
* update camera handling in BarcodeScanner and improve permission request for mobile devices ([0d92842](https://github.com/maxgfr/loyalty-card-vault/commit/0d92842570ebf75902f0880205a7c216ab038014))
* use helper function for BufferSource type compatibility ([766c63e](https://github.com/maxgfr/loyalty-card-vault/commit/766c63e9fcfe22ef7a322efc168675e6ecddff2c))
* use Uint8Array directly in Web Crypto API calls ([cdf5d32](https://github.com/maxgfr/loyalty-card-vault/commit/cdf5d325078fc2b8d84c32087576a6ecd20e7847))

### Code Refactoring

* integrate help guide into settings and reduce spacing ([a405102](https://github.com/maxgfr/loyalty-card-vault/commit/a40510253fd4dbbb83af4e814da1811d007103df))
* remove WebRTC sync and encryption toggle, simplify architecture ([809dede](https://github.com/maxgfr/loyalty-card-vault/commit/809dede4818b96871aefd3aa32bfac62f62ad612))
* restore pwa-asset-generator and remove unused functions ([afbb1dc](https://github.com/maxgfr/loyalty-card-vault/commit/afbb1dc129745531649d5c695230fb40bdacd7fc))
* synchronize titles and clean unused code ([a5bb759](https://github.com/maxgfr/loyalty-card-vault/commit/a5bb7597ebd393ef580c77d9dc13e1ef16fbe096))

### Documentation

* add comprehensive README and GitHub Actions deployment ([26a54e6](https://github.com/maxgfr/loyalty-card-vault/commit/26a54e6527c080b84d33f076fe26c996055f5ed7))
