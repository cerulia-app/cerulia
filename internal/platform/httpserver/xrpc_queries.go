package httpserver

import (
	"net/http"
	"strings"

	"cerulia/internal/store"
)

func (h *handler) handleGetCharacterHome(w http.ResponseWriter, r *http.Request) {
	subject, err := h.authorize(r, "app.cerulia.rpc.getCharacterHome", false)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	view, err := h.projections.GetCharacterHome(r.Context(), subject.ActorDID, r.URL.Query().Get("ownerDid"))
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *handler) handleListCharacterBranches(w http.ResponseWriter, r *http.Request) {
	subject, err := h.authorize(r, "app.cerulia.rpc.listCharacterBranches", false)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	limit, err := parseLimit(r.URL.Query().Get("limit"))
	if err != nil {
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", err.Error())
		return
	}
	page, err := h.projections.ListCharacterBranches(r.Context(), subject.ActorDID, limit, r.URL.Query().Get("cursor"))
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, page)
}

func (h *handler) handleGetCharacterBranchView(w http.ResponseWriter, r *http.Request) {
	subject, err := h.authorize(r, "app.cerulia.rpc.getCharacterBranchView", false)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	branchRef := strings.TrimSpace(r.URL.Query().Get("characterBranchRef"))
	if branchRef == "" {
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", "missing characterBranchRef")
		return
	}
	if _, err := store.ParseRef(branchRef); err != nil {
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", "invalid characterBranchRef")
		return
	}
	view, err := h.projections.GetCharacterBranchView(r.Context(), subject.ActorDID, branchRef)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *handler) handleGetCampaignView(w http.ResponseWriter, r *http.Request) {
	campaignRef := strings.TrimSpace(r.URL.Query().Get("campaignRef"))
	if campaignRef == "" {
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", "missing campaignRef")
		return
	}
	if _, err := store.ParseRef(campaignRef); err != nil {
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", "invalid campaignRef")
		return
	}
	mode := strings.TrimSpace(r.URL.Query().Get("mode"))
	switch mode {
	case "", "owner-steward", "public":
	default:
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", "invalid mode")
		return
	}
	subject, err := h.authorize(r, "app.cerulia.rpc.getCampaignView", mode == "public")
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	view, err := h.projections.GetCampaignView(r.Context(), subject.ActorDID, campaignRef, mode)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *handler) handleListCampaigns(w http.ResponseWriter, r *http.Request) {
	mode := strings.TrimSpace(r.URL.Query().Get("mode"))
	switch mode {
	case "", "owner-steward", "public":
	default:
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", "invalid mode")
		return
	}
	subject, err := h.authorize(r, "app.cerulia.rpc.listCampaigns", mode == "public")
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	limit, err := parseLimit(r.URL.Query().Get("limit"))
	if err != nil {
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", err.Error())
		return
	}
	page, err := h.projections.ListCampaigns(r.Context(), subject.ActorDID, mode, limit, r.URL.Query().Get("cursor"))
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, page)
}

func (h *handler) handleListCharacterEpisodes(w http.ResponseWriter, r *http.Request) {
	subject, err := h.authorize(r, "app.cerulia.rpc.listCharacterEpisodes", false)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	branchRef := strings.TrimSpace(r.URL.Query().Get("characterBranchRef"))
	if branchRef == "" {
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", "missing characterBranchRef")
		return
	}
	if _, err := store.ParseRef(branchRef); err != nil {
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", "invalid characterBranchRef")
		return
	}
	limit, err := parseLimit(r.URL.Query().Get("limit"))
	if err != nil {
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", err.Error())
		return
	}
	page, err := h.projections.ListCharacterEpisodes(r.Context(), subject.ActorDID, branchRef, limit, r.URL.Query().Get("cursor"))
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, page)
}

func (h *handler) handleListReuseGrants(w http.ResponseWriter, r *http.Request) {
	subject, err := h.authorize(r, "app.cerulia.rpc.listReuseGrants", false)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	branchRef := strings.TrimSpace(r.URL.Query().Get("characterBranchRef"))
	if branchRef == "" {
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", "missing characterBranchRef")
		return
	}
	if _, err := store.ParseRef(branchRef); err != nil {
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", "invalid characterBranchRef")
		return
	}
	state := strings.TrimSpace(r.URL.Query().Get("state"))
	switch state {
	case "", "active", "revoked", "expired", "all":
	default:
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", "invalid state")
		return
	}
	limit, err := parseLimit(r.URL.Query().Get("limit"))
	if err != nil {
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", err.Error())
		return
	}
	page, err := h.projections.ListReuseGrants(r.Context(), subject.ActorDID, branchRef, state, limit, r.URL.Query().Get("cursor"))
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, page)
}

func (h *handler) handleListPublications(w http.ResponseWriter, r *http.Request) {
	mode := strings.TrimSpace(r.URL.Query().Get("mode"))
	switch mode {
	case "", "owner-steward", "public":
	default:
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", "invalid mode")
		return
	}
	subjectRef := strings.TrimSpace(r.URL.Query().Get("subjectRef"))
	if subjectRef != "" {
		if _, err := store.ParseRef(subjectRef); err != nil {
			writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", "invalid subjectRef")
			return
		}
	}
	subjectKind := strings.TrimSpace(r.URL.Query().Get("subjectKind"))
	switch subjectKind {
	case "", "campaign", "character-branch", "character-episode":
	default:
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", "invalid subjectKind")
		return
	}
	includeRetired, err := parseBoolQuery(r.URL.Query().Get("includeRetired"))
	if err != nil {
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", err.Error())
		return
	}
	subject, err := h.authorize(r, "app.cerulia.rpc.listPublications", mode == "public")
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	limit, err := parseLimit(r.URL.Query().Get("limit"))
	if err != nil {
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", err.Error())
		return
	}
	page, err := h.projections.ListPublications(r.Context(), subject.ActorDID, subjectRef, subjectKind, mode, includeRetired, limit, r.URL.Query().Get("cursor"))
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, page)
}

func (h *handler) handleListPublicationLibrary(w http.ResponseWriter, r *http.Request) {
	mode := strings.TrimSpace(r.URL.Query().Get("mode"))
	switch mode {
	case "", "owner-steward", "public":
	default:
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", "invalid mode")
		return
	}
	subjectRef := strings.TrimSpace(r.URL.Query().Get("subjectRef"))
	if subjectRef != "" {
		if _, err := store.ParseRef(subjectRef); err != nil {
			writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", "invalid subjectRef")
			return
		}
	}
	subjectKind := strings.TrimSpace(r.URL.Query().Get("subjectKind"))
	switch subjectKind {
	case "", "campaign", "character-branch", "character-episode":
	default:
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", "invalid subjectKind")
		return
	}
	subject, err := h.authorize(r, "app.cerulia.rpc.listPublicationLibrary", mode == "public")
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	limit, err := parseLimit(r.URL.Query().Get("limit"))
	if err != nil {
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", err.Error())
		return
	}
	page, err := h.projections.ListPublicationLibrary(r.Context(), subject.ActorDID, subjectRef, subjectKind, mode, limit, r.URL.Query().Get("cursor"))
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, page)
}

func (h *handler) handleGetPublicationView(w http.ResponseWriter, r *http.Request) {
	mode := strings.TrimSpace(r.URL.Query().Get("mode"))
	switch mode {
	case "", "owner-steward", "public":
	default:
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", "invalid mode")
		return
	}
	publicationRef := strings.TrimSpace(r.URL.Query().Get("publicationRef"))
	if publicationRef == "" {
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", "missing publicationRef")
		return
	}
	if _, err := store.ParseRef(publicationRef); err != nil {
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", "invalid publicationRef")
		return
	}
	subject, err := h.authorize(r, "app.cerulia.rpc.getPublicationView", mode == "public")
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	view, err := h.projections.GetPublicationView(r.Context(), subject.ActorDID, publicationRef, mode)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, view)
}
