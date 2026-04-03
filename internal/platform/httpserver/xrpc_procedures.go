package httpserver

import (
	"net/http"

	"cerulia/internal/core/command"
	runcommand "cerulia/internal/run/command"
)

func (h *handler) handleCreateSessionDraft(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[runcommand.CreateSessionDraftInput](h, w, r, "app.cerulia.rpc.createSessionDraft")
	if !ok {
		return
	}
	ack, err := h.runCommands.CreateSessionDraft(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleOpenSession(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[runcommand.SessionStateInput](h, w, r, "app.cerulia.rpc.openSession")
	if !ok {
		return
	}
	ack, err := h.runCommands.OpenSession(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleStartSession(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[runcommand.SessionStateInput](h, w, r, "app.cerulia.rpc.startSession")
	if !ok {
		return
	}
	ack, err := h.runCommands.StartSession(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handlePauseSession(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[runcommand.SessionStateInput](h, w, r, "app.cerulia.rpc.pauseSession")
	if !ok {
		return
	}
	ack, err := h.runCommands.PauseSession(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleResumeSession(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[runcommand.SessionStateInput](h, w, r, "app.cerulia.rpc.resumeSession")
	if !ok {
		return
	}
	ack, err := h.runCommands.ResumeSession(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleCloseSession(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[runcommand.SessionStateInput](h, w, r, "app.cerulia.rpc.closeSession")
	if !ok {
		return
	}
	ack, err := h.runCommands.CloseSession(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleArchiveSession(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[runcommand.SessionStateInput](h, w, r, "app.cerulia.rpc.archiveSession")
	if !ok {
		return
	}
	ack, err := h.runCommands.ArchiveSession(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleReopenSession(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[runcommand.ReopenSessionInput](h, w, r, "app.cerulia.rpc.reopenSession")
	if !ok {
		return
	}
	ack, err := h.runCommands.ReopenSession(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleTransferAuthority(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[runcommand.TransferAuthorityInput](h, w, r, "app.cerulia.rpc.transferAuthority")
	if !ok {
		return
	}
	ack, err := h.runCommands.TransferAuthority(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleInviteSession(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[runcommand.InviteSessionInput](h, w, r, "app.cerulia.rpc.inviteSession")
	if !ok {
		return
	}
	ack, err := h.runCommands.InviteSession(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleCancelInvitation(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[runcommand.CancelInvitationInput](h, w, r, "app.cerulia.rpc.cancelInvitation")
	if !ok {
		return
	}
	ack, err := h.runCommands.CancelInvitation(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleJoinSession(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[runcommand.JoinSessionInput](h, w, r, "app.cerulia.rpc.joinSession")
	if !ok {
		return
	}
	ack, err := h.runCommands.JoinSession(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleLeaveSession(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[runcommand.LeaveSessionInput](h, w, r, "app.cerulia.rpc.leaveSession")
	if !ok {
		return
	}
	ack, err := h.runCommands.LeaveSession(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleModerateMembership(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[runcommand.ModerateMembershipInput](h, w, r, "app.cerulia.rpc.moderateMembership")
	if !ok {
		return
	}
	ack, err := h.runCommands.ModerateMembership(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handlePublishSessionLink(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[runcommand.PublishSessionLinkInput](h, w, r, "app.cerulia.rpc.publishSessionLink")
	if !ok {
		return
	}
	ack, err := h.runCommands.PublishSessionLink(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleRetireSessionLink(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[runcommand.RetireSessionLinkInput](h, w, r, "app.cerulia.rpc.retireSessionLink")
	if !ok {
		return
	}
	ack, err := h.runCommands.RetireSessionLink(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleSubmitAppeal(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[runcommand.SubmitAppealInput](h, w, r, "app.cerulia.rpc.submitAppeal")
	if !ok {
		return
	}
	ack, err := h.runCommands.SubmitAppeal(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleWithdrawAppeal(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[runcommand.WithdrawAppealInput](h, w, r, "app.cerulia.rpc.withdrawAppeal")
	if !ok {
		return
	}
	ack, err := h.runCommands.WithdrawAppeal(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleReviewAppeal(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[runcommand.ReviewAppealInput](h, w, r, "app.cerulia.rpc.reviewAppeal")
	if !ok {
		return
	}
	ack, err := h.runCommands.ReviewAppeal(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleEscalateAppeal(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[runcommand.EscalateAppealInput](h, w, r, "app.cerulia.rpc.escalateAppeal")
	if !ok {
		return
	}
	ack, err := h.runCommands.EscalateAppeal(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleResolveAppeal(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[runcommand.ResolveAppealInput](h, w, r, "app.cerulia.rpc.resolveAppeal")
	if !ok {
		return
	}
	ack, err := h.runCommands.ResolveAppeal(r.Context(), subject.ActorDID, input)
	if err != nil {
		writeXRPCFailure(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ack)
}

func (h *handler) handleCreateCampaign(w http.ResponseWriter, r *http.Request) {
	input, subject, ok := decodeProcedure[command.CreateCampaignInput](h, w, r, "app.cerulia.rpc.createCampaign")
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
	input, subject, ok := decodeProcedure[command.AttachRuleProfileInput](h, w, r, "app.cerulia.rpc.attachRuleProfile")
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
	input, subject, ok := decodeProcedure[command.RetireRuleProfileInput](h, w, r, "app.cerulia.rpc.retireRuleProfile")
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
	input, subject, ok := decodeProcedure[command.ImportCharacterSheetInput](h, w, r, "app.cerulia.rpc.importCharacterSheet")
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
	input, subject, ok := decodeProcedure[command.CreateCharacterBranchInput](h, w, r, "app.cerulia.rpc.createCharacterBranch")
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
	input, subject, ok := decodeProcedure[command.UpdateCharacterBranchInput](h, w, r, "app.cerulia.rpc.updateCharacterBranch")
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
	input, subject, ok := decodeProcedure[command.RetireCharacterBranchInput](h, w, r, "app.cerulia.rpc.retireCharacterBranch")
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
	input, subject, ok := decodeProcedure[command.RecordCharacterAdvancementInput](h, w, r, "app.cerulia.rpc.recordCharacterAdvancement")
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
	input, subject, ok := decodeProcedure[command.RecordCharacterEpisodeInput](h, w, r, "app.cerulia.rpc.recordCharacterEpisode")
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
	input, subject, ok := decodeProcedure[command.RecordCharacterConversionInput](h, w, r, "app.cerulia.rpc.recordCharacterConversion")
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
	input, subject, ok := decodeProcedure[command.PublishSubjectInput](h, w, r, "app.cerulia.rpc.publishSubject")
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
	input, subject, ok := decodeProcedure[command.RetirePublicationInput](h, w, r, "app.cerulia.rpc.retirePublication")
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
	input, subject, ok := decodeProcedure[command.GrantReuseInput](h, w, r, "app.cerulia.rpc.grantReuse")
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
	input, subject, ok := decodeProcedure[command.RevokeReuseInput](h, w, r, "app.cerulia.rpc.revokeReuse")
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
