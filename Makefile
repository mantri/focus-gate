.PHONY: test test-verbose check

test:
	node --test tests/*.test.mjs

test-verbose:
	node --test --test-reporter=spec tests/*.test.mjs

# Syntax-check every JS file shipped in the extension
check:
	for f in $$(find src seed -name '*.js' 2>/dev/null) manifest.json seed/default-config.json; do \
		case "$$f" in \
			*.json) node -e "JSON.parse(require('fs').readFileSync('$$f','utf8'))" || exit 1;; \
			*) node --check "$$f" || exit 1;; \
		esac; \
	done
