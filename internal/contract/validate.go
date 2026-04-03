package contract

import (
	"errors"
	"fmt"
	"strings"
)

func ValidateCatalog(documents map[string]map[string]any) error {
	if len(documents) == 0 {
		return errors.New("empty contract catalog")
	}

	ids := map[string]string{}
	refs := map[string]struct{}{}
	knownLexicons := map[string]struct{}{}
	var errs []error

	for path, document := range documents {
		id, ok := document["id"].(string)
		if !ok || strings.TrimSpace(id) == "" {
			errs = append(errs, fmt.Errorf("%s: missing lexicon id", path))
			continue
		}

		if previous, exists := ids[id]; exists {
			errs = append(errs, fmt.Errorf("duplicate lexicon id %q in %s and %s", id, previous, path))
			continue
		}
		ids[id] = path
		knownLexicons[id] = struct{}{}

		defs, ok := document["defs"].(map[string]any)
		if !ok {
			errs = append(errs, fmt.Errorf("%s: defs must be an object", path))
			continue
		}

		for name := range defs {
			refs[id+"#"+name] = struct{}{}
		}
	}

	for path, document := range documents {
		walkRefs(path, document, refs, &errs)
		validateLXMs(path, document, knownLexicons, &errs)
	}

	if len(errs) > 0 {
		return errors.Join(errs...)
	}

	return nil
}

func walkRefs(path string, node any, refs map[string]struct{}, errs *[]error) {
	switch typed := node.(type) {
	case map[string]any:
		if ref, ok := typed["ref"].(string); ok && strings.Contains(ref, "#") {
			if _, exists := refs[ref]; !exists {
				*errs = append(*errs, fmt.Errorf("%s: unresolved ref %q", path, ref))
			}
		}

		if unionRefs, ok := typed["refs"].([]string); ok {
			for _, ref := range unionRefs {
				if strings.Contains(ref, "#") {
					if _, exists := refs[ref]; !exists {
						*errs = append(*errs, fmt.Errorf("%s: unresolved ref %q", path, ref))
					}
				}
			}
		}

		if unionRefs, ok := typed["refs"].([]any); ok {
			for _, raw := range unionRefs {
				ref, ok := raw.(string)
				if !ok || !strings.Contains(ref, "#") {
					continue
				}

				if _, exists := refs[ref]; !exists {
					*errs = append(*errs, fmt.Errorf("%s: unresolved ref %q", path, ref))
				}
			}
		}

		for _, value := range typed {
			walkRefs(path, value, refs, errs)
		}
	case []any:
		for _, value := range typed {
			walkRefs(path, value, refs, errs)
		}
	case []map[string]any:
		for _, value := range typed {
			walkRefs(path, value, refs, errs)
		}
	}
}

func validateLXMs(path string, node any, knownLexicons map[string]struct{}, errs *[]error) {
	switch typed := node.(type) {
	case map[string]any:
		if lxms, ok := typed["lxm"].([]string); ok {
			for _, lxm := range lxms {
				if _, exists := knownLexicons[lxm]; !exists {
					*errs = append(*errs, fmt.Errorf("%s: unresolved lxm %q", path, lxm))
				}
			}
		}

		if lxms, ok := typed["lxm"].([]any); ok {
			for _, raw := range lxms {
				lxm, ok := raw.(string)
				if !ok {
					continue
				}
				if _, exists := knownLexicons[lxm]; !exists {
					*errs = append(*errs, fmt.Errorf("%s: unresolved lxm %q", path, lxm))
				}
			}
		}

		for _, value := range typed {
			validateLXMs(path, value, knownLexicons, errs)
		}
	case []any:
		for _, value := range typed {
			validateLXMs(path, value, knownLexicons, errs)
		}
	case []map[string]any:
		for _, value := range typed {
			validateLXMs(path, value, knownLexicons, errs)
		}
	}
}
