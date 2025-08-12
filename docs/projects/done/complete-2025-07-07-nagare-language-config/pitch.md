# Pitch: Configurable Language Settings for Nagare

## Problem

Currently, Nagare automatically uses the system locale to determine the display language. This forces Japanese on users
with Japanese system locales, even if they prefer English. There's no way to override this behavior.

## Appetite

1 day - This is a small but important UX improvement.

## Solution

Add a language configuration option that:

1. Defaults to English (not system locale)
2. Can be set via:
   - Config file: `options.language: "en" | "ja"`
   - CLI flag: `--lang en` or `--lang ja`
   - Environment variable: `NAGARE_LANG=en`

Priority order: CLI flag > Config file > Env var > Default (English)

## Rabbit Holes

- Don't auto-detect from system locale anymore
- Keep the existing i18n infrastructure, just change how language is selected
- Ensure all new error messages have translations

## No-gos

- No other languages for now (just en/ja)
- No complex locale detection logic
- No per-command language switching

## Nice-to-haves

- Add language info to `--version-detailed` output
- Document the language setting in README
