package httpserver

import (
	"net/http"

	corecommand "cerulia/internal/core/command"
)

func (h *handler) handleCreateCampaign(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[corecommand.CreateCampaignInput](h, w, r, "app.cerulia.rpc.createCampaign")
	if !ok {
		return
	}
	ack, err := h.commands.CreateCampaign(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleAttachRuleProfile(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[corecommand.AttachRuleProfileInput](h, w, r, "app.cerulia.rpc.attachRuleProfile")
	if !ok {
		return
	}
	ack, err := h.commands.AttachRuleProfile(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleRetireRuleProfile(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[corecommand.RetireRuleProfileInput](h, w, r, "app.cerulia.rpc.retireRuleProfile")
	if !ok {
		return
	}
	ack, err := h.commands.RetireRuleProfile(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleImportCharacterSheet(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[corecommand.ImportCharacterSheetInput](h, w, r, "app.cerulia.rpc.importCharacterSheet")
	if !ok {
		return
	}
	ack, err := h.commands.ImportCharacterSheet(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleCreateCharacterBranch(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[corecommand.CreateCharacterBranchInput](h, w, r, "app.cerulia.rpc.createCharacterBranch")
	if !ok {
		return
	}
	ack, err := h.commands.CreateCharacterBranch(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleUpdateCharacterBranch(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[corecommand.UpdateCharacterBranchInput](h, w, r, "app.cerulia.rpc.updateCharacterBranch")
	if !ok {
		return
	}
	ack, err := h.commands.UpdateCharacterBranch(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleRetireCharacterBranch(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[corecommand.RetireCharacterBranchInput](h, w, r, "app.cerulia.rpc.retireCharacterBranch")
	if !ok {
		return
	}
	ack, err := h.commands.RetireCharacterBranch(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleRecordCharacterAdvancement(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[corecommand.RecordCharacterAdvancementInput](h, w, r, "app.cerulia.rpc.recordCharacterAdvancement")
	if !ok {
		return
	}
	ack, err := h.commands.RecordCharacterAdvancement(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleRecordCharacterEpisode(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[corecommand.RecordCharacterEpisodeInput](h, w, r, "app.cerulia.rpc.recordCharacterEpisode")
	if !ok {
		return
	}
	ack, err := h.commands.RecordCharacterEpisode(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleRecordCharacterConversion(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[corecommand.RecordCharacterConversionInput](h, w, r, "app.cerulia.rpc.recordCharacterConversion")
	if !ok {
		return
	}
	ack, err := h.commands.RecordCharacterConversion(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handlePublishSubject(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[corecommand.PublishSubjectInput](h, w, r, "app.cerulia.rpc.publishSubject")
	if !ok {
		return
	}
	ack, err := h.commands.PublishSubject(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleRetirePublication(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[corecommand.RetirePublicationInput](h, w, r, "app.cerulia.rpc.retirePublication")
	if !ok {
		return
	}
	ack, err := h.commands.RetirePublication(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleGrantReuse(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[corecommand.GrantReuseInput](h, w, r, "app.cerulia.rpc.grantReuse")
	if !ok {
		return
	}
	ack, err := h.commands.GrantReuse(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleRevokeReuse(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[corecommand.RevokeReuseInput](h, w, r, "app.cerulia.rpc.revokeReuse")
	if !ok {
		return
	}
	ack, err := h.commands.RevokeReuse(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}
