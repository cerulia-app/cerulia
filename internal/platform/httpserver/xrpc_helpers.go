package httpserver

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"cerulia/internal/authz"
	corecommand "cerulia/internal/core/command"
	coreprojection "cerulia/internal/core/projection"
	"cerulia/internal/store"
)

type xrpcErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

func (h *handler) authorize(r *http.Request, operationNSID string, allowAnonymous bool) (authz.Subject, error) {
	return h.auth.AuthorizeRequest(r, operationNSID, allowAnonymous)
}

func decodeJSONBody[T any](r *http.Request) (T, error) {
	var payload T
	if r.Body == nil {
		return payload, nil
	}
	defer r.Body.Close()
	// Lexicon evolution requires unknown fields to be ignored for forward compatibility.
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&payload); err != nil {
		return payload, fmt.Errorf("decode json body: %w", err)
	}
	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF {
		if err == nil {
			return payload, fmt.Errorf("decode json body: trailing content")
		}
		return payload, fmt.Errorf("decode json body: %w", err)
	}
	return payload, nil
}

func parseLimit(raw string) (int, error) {
	if strings.TrimSpace(raw) == "" {
		return 0, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return 0, err
	}
	return value, nil
}

func parseBoolQuery(raw string) (bool, error) {
	if strings.TrimSpace(raw) == "" {
		return false, nil
	}
	return strconv.ParseBool(raw)
}

func writeXRPCError(w http.ResponseWriter, statusCode int, shortName string, message string) {
	writeJSON(w, statusCode, xrpcErrorResponse{Error: shortName, Message: message})
}

func writeXRPCFailure(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, authz.ErrUnauthorized):
		w.Header().Set("WWW-Authenticate", `Bearer realm="cerulia", error="invalid_token"`)
		writeXRPCError(w, http.StatusUnauthorized, "Unauthorized", err.Error())
	case errors.Is(err, authz.ErrForbidden), errors.Is(err, corecommand.ErrForbidden), errors.Is(err, coreprojection.ErrForbidden):
		writeXRPCError(w, http.StatusForbidden, "Forbidden", err.Error())
	case errors.Is(err, store.ErrNotFound):
		writeXRPCError(w, http.StatusNotFound, "NotFound", err.Error())
	case errors.Is(err, corecommand.ErrUnsupportedRuleset):
		writeXRPCError(w, http.StatusBadRequest, "UnsupportedRuleset", err.Error())
	case errors.Is(err, corecommand.ErrInvalidInput), errors.Is(err, coreprojection.ErrInvalidInput):
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", err.Error())
	default:
		writeXRPCError(w, http.StatusInternalServerError, "InternalError", err.Error())
	}
}

func decodeProcedure[T any](h *handler, w http.ResponseWriter, r *http.Request, operationNSID string) (T, authz.Subject, bool) {
	var zero T
	subject, err := h.authorize(r, operationNSID, false)
	if err != nil {
		writeXRPCFailure(w, err)
		return zero, authz.Subject{}, false
	}
	payload, err := decodeJSONBody[T](r)
	if err != nil {
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", err.Error())
		return zero, authz.Subject{}, false
	}
	return payload, subject, true
}
