package httpserver

import (
	"net/http"
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

func (h *handler) handleGetCampaignView(w http.ResponseWriter, r *http.Request) {
	mode := r.URL.Query().Get("mode")
	subject, err := h.authorize(r, "app.cerulia.rpc.getCampaignView", mode == "public")
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	view, err := h.projections.GetCampaignView(r.Context(), subject.ActorDID, r.URL.Query().Get("campaignRef"), mode)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *handler) handleListCharacterEpisodes(w http.ResponseWriter, r *http.Request) {
	subject, err := h.authorize(r, "app.cerulia.rpc.listCharacterEpisodes", false)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	limit, err := parseLimit(r.URL.Query().Get("limit"))
	if err != nil {
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", err.Error())
		return
	}
	page, err := h.projections.ListCharacterEpisodes(r.Context(), subject.ActorDID, r.URL.Query().Get("characterBranchRef"), limit, r.URL.Query().Get("cursor"))
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
	limit, err := parseLimit(r.URL.Query().Get("limit"))
	if err != nil {
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", err.Error())
		return
	}
	page, err := h.projections.ListReuseGrants(r.Context(), subject.ActorDID, r.URL.Query().Get("characterBranchRef"), r.URL.Query().Get("state"), limit, r.URL.Query().Get("cursor"))
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, page)
}

func (h *handler) handleListPublications(w http.ResponseWriter, r *http.Request) {
	mode := r.URL.Query().Get("mode")
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
	page, err := h.projections.ListPublications(r.Context(), subject.ActorDID, r.URL.Query().Get("subjectRef"), r.URL.Query().Get("subjectKind"), mode, includeRetired, limit, r.URL.Query().Get("cursor"))
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, page)
}

func (h *handler) handleExportServiceLog(w http.ResponseWriter, r *http.Request) {
	if _, err := h.authorize(r, "app.cerulia.rpc.exportServiceLog", false); err != nil {
		writeXRPCFailure(w, err)
		return
	}
	limit, err := parseLimit(r.URL.Query().Get("limit"))
	if err != nil {
		writeXRPCError(w, http.StatusBadRequest, "InvalidRequest", err.Error())
		return
	}
	page, err := h.projections.ExportServiceLog(r.Context(), r.URL.Query().Get("governingRef"), r.URL.Query().Get("requestId"), limit, r.URL.Query().Get("cursor"))
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, page)
}
