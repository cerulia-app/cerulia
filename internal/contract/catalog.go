package contract

func Catalog() map[string]map[string]any {
	documents := map[string]map[string]any{}
	for path, document := range defsCatalog() {
		documents[path] = document
	}
	for path, document := range authCatalog() {
		documents[path] = document
	}
	for path, document := range runAuthCatalog() {
		documents[path] = document
	}
	for path, document := range coreCatalog() {
		documents[path] = document
	}
	for path, document := range runCatalog() {
		documents[path] = document
	}
	for path, document := range rpcCatalog() {
		documents[path] = document
	}
	for path, document := range runRPCCatalog() {
		documents[path] = document
	}

	return documents
}
