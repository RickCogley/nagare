# Missing Japanese Translations Report

## Summary

After comparing `locales/en.yaml` and `locales/ja.yaml`, I found several missing Japanese
translations in the `ja.yaml` file.

## Missing Translations

### Security Error Keys (errors.security*)

The following security-related error keys are missing from the Japanese locale file:

1. **securityInvalidPath** (line 59 in en.yaml)
   - English: "Invalid path: {reason}"

2. **securityPathNotAbsolute** (line 60 in en.yaml)
   - English: "Path must be absolute: {path}"

3. **securityForbiddenChars** (line 61 in en.yaml)
   - English: "Path contains forbidden characters: {chars}"

### Suggestion Keys (suggestions.*)

The following suggestion keys are missing from the Japanese locale file:

1. **provideValidString** (line 301 in en.yaml)
   - English: "Provide a valid {type} as a string"

2. **checkNotNull** (line 302 in en.yaml)
   - English: "Check that the value is not null or undefined"

3. **ensureNotNumberOrObject** (line 303 in en.yaml)
   - English: "Ensure the value is not a number or object"

4. **provideNonEmpty** (line 304 in en.yaml)
   - English: "Provide a non-empty {type} name"

5. **checkWhitespace** (line 305 in en.yaml)
   - English: "Check for accidental whitespace-only values"

6. **useSimpleNames** (line 306 in en.yaml)
   - English: "Use simple names without special characters"

7. **useOnlyAlphanumeric** (line 307 in en.yaml)
   - English: "Use only alphanumeric characters, hyphens, and underscores"

8. **avoidSpecialChars** (line 308 in en.yaml)
   - English: "Avoid special characters like {chars}"

9. **checkGitDocs** (line 309 in en.yaml)
   - English: "Check git documentation for valid {type} naming"

10. **followGitNaming** (line 310 in en.yaml)
    - English: "Follow git naming conventions"

11. **useShorterName** (line 311 in en.yaml)
    - English: "Use a shorter name (max {max} characters)"

12. **provideFullHash** (line 312 in en.yaml)
    - English: "Provide the full 40-character commit hash"

13. **checkGitLog** (line 313 in en.yaml)
    - English: "Use 'git log --oneline' to find valid commit hashes"

14. **useAbsolutePath** (line 314 in en.yaml)
    - English: "Use an absolute path starting with /"

15. **removeTraversal** (line 315 in en.yaml)
    - English: "Remove '..' and similar path traversal attempts"

16. **stayWithinProject** (line 316 in en.yaml)
    - English: "Ensure the path stays within your project directory"

17. **useForwardSlashes** (line 317 in en.yaml)
    - English: "Use forward slashes (/) for path separators"

18. **checkPathExists** (line 318 in en.yaml)
    - English: "Verify the path exists and is accessible"

19. **provideSemver** (line 319 in en.yaml)
    - English: "Provide a valid semantic version (e.g., 1.2.3)"

20. **checkVersionFormat** (line 320 in en.yaml)
    - English: "Check format: major.minor.patch (e.g., 1.0.0)"

21. **removeInvalidChars** (line 321 in en.yaml)
    - English: "Remove invalid characters from version string"

22. **provideValidGitRef** (line 323 in en.yaml)
    - English: "Provide a valid git reference as a string"

23. **checkNotNullOrUndefined** (line 324 in en.yaml)
    - English: "Check that the value is not null or undefined"

24. **ensureStringType** (line 325 in en.yaml)
    - English: "Ensure the value is a string type"

25. **removeSpecialChars** (line 326 in en.yaml)
    - English: "Remove special characters from the value"

26. **useAlphanumeric** (line 327 in en.yaml)
    - English: "Use only alphanumeric characters"

27. **noStartWithHyphen** (line 328 in en.yaml)
    - English: "Git references cannot start with a hyphen"

28. **removeDoubleDots** (line 329 in en.yaml)
    - English: "Remove consecutive dots (..) from the reference"

29. **noEndWithDotOrLock** (line 330 in en.yaml)
    - English: "References cannot end with '.' or '.lock'"

30. **removeAtBraces** (line 331 in en.yaml)
    - English: "Remove '@' symbols and curly braces"

31. **useConciseNaming** (line 332 in en.yaml)
    - English: "Use concise and descriptive names"

32. **useAbbreviatedVersions** (line 333 in en.yaml)
    - English: "Consider using abbreviated version names"

33. **checkForNullUndefined** (line 334 in en.yaml)
    - English: "Check for null or undefined values"

34. **checkInputSource** (line 335 in en.yaml)
    - English: "Verify the input source is correct"

35. **convertNumbersToStrings** (line 336 in en.yaml)
    - English: "Convert numeric values to strings"

36. **ensureStringArgs** (line 337 in en.yaml)
    - English: "Ensure all arguments are strings"

37. **escapeSpecialChars** (line 338 in en.yaml)
    - English: "Escape special characters properly"

38. **forbiddenChars** (line 339 in en.yaml)
    - English: "Remove forbidden characters: {chars}"

39. **provideValidPath** (line 340 in en.yaml)
    - English: "Provide a valid file system path"

40. **removeNullBytes** (line 341 in en.yaml)
    - English: "Remove null bytes from the input"

41. **removeShellMetachars** (line 342 in en.yaml)
    - English: "Remove shell metacharacters for security"

42. **checkSemverDocs** (line 343 in en.yaml)
    - English: "Check semantic versioning documentation"

43. **checkSymbolicLinks** (line 344 in en.yaml)
    - English: "Check for symbolic link issues"

44. **useGitRevParse** (line 345 in en.yaml)
    - English: "Use 'git rev-parse' to resolve references"

45. **useParamSubstitution** (line 346 in en.yaml)
    - English: "Use parameter substitution for safety"

46. **useRelativePaths** (line 347 in en.yaml)
    - English: "Consider using relative paths"

47. **useSemverFormat** (line 348 in en.yaml)
    - English: "Use semantic versioning format (major.minor.patch)"

48. **validateEncoding** (line 349 in en.yaml)
    - English: "Validate character encoding"

49. **validSemverExamples** (line 350 in en.yaml)
    - English: "Valid examples: 1.0.0, 2.1.3, 0.1.0-beta"

## Notes

1. The Japanese file appears to have incorrect keys for some security errors. For example:
   - Lines 45-50 in ja.yaml show simplified security error messages without the proper parameter
     placeholders
   - The English version uses more specific keys like
     `securityInvalidGitRef: "Invalid {type}: must be a non-empty string"`
   - The Japanese version has generic messages like `securityInvalidGitRef: "無効なGit参照: {ref}"`

2. The security error keys in the Japanese file (lines 45-58) don't match the structure of the
   English file and are missing several important keys.

3. All the extended suggestion keys (lines 323-350 in en.yaml) are completely missing from the
   Japanese file.

## Recommendation

The Japanese locale file needs to be updated with:

1. The 3 missing security error keys with proper translations
2. The 49 missing suggestion keys with proper translations
3. Review and correction of the existing security error translations to match the English structure
   and include proper parameter placeholders
