package com.resolveit.service;

import com.resolveit.dto.InternalNoteRequest;
import com.resolveit.model.Complaint;
import com.resolveit.model.InternalNote;
import com.resolveit.model.User;
import com.resolveit.repository.ComplaintRepository;
import com.resolveit.repository.InternalNoteRepository;
import com.resolveit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class InternalNoteService {

    private final InternalNoteRepository internalNoteRepository;
    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;

    @Transactional
    public InternalNote addNote(Long complaintId, InternalNoteRequest request, User user) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));

        // Check if user has permission to add notes
        if (!hasNotePermission(complaint, user)) {
            throw new RuntimeException("You don't have permission to add notes to this complaint");
        }

        InternalNote note = new InternalNote();
        note.setComplaint(complaint);
        note.setUser(user);
        note.setContent(request.getContent());
        note.setIsPrivate(request.getIsPrivate());

        if (request.getMentionedUserId() != null) {
            User mentionedUser = userRepository.findById(request.getMentionedUserId())
                    .orElseThrow(() -> new RuntimeException("Mentioned user not found"));
            note.setMentionedUser(mentionedUser);

            log.info("User {} mentioned {} in complaint {}",
                    user.getEmail(), mentionedUser.getEmail(), complaintId);
        }

        InternalNote savedNote = internalNoteRepository.save(note);

        log.info("Internal note added to complaint {} by {}", complaintId, user.getEmail());

        return savedNote;
    }

    @Transactional(readOnly = true)
    public List<InternalNote> getNotes(Long complaintId, User user) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));

        if (!hasNotePermission(complaint, user)) {
            throw new RuntimeException("You don't have permission to view notes for this complaint");
        }

        return internalNoteRepository.findVisibleNotes(complaintId, user.getId());
    }

    @Transactional(readOnly = true)
    public List<InternalNote> getMentions(User user) {
        return internalNoteRepository.findByMentionedUserIdOrderByCreatedAtDesc(user.getId());
    }

    @Transactional
    public void deleteNote(Long noteId, User user) {
        InternalNote note = internalNoteRepository.findById(noteId)
                .orElseThrow(() -> new RuntimeException("Note not found"));

        if (!note.getUser().getId().equals(user.getId()) &&
                user.getRole() != User.Role.ADMIN) {
            throw new RuntimeException("You can only delete your own notes");
        }

        internalNoteRepository.delete(note);

        log.info("Internal note {} deleted by {}", noteId, user.getEmail());
    }

    private boolean hasNotePermission(Complaint complaint, User user) {
        if (user.getRole() == User.Role.ADMIN) {
            return true;
        }

        if (user.getRole() == User.Role.SENIOR_EMPLOYEE ||
                user.getRole() == User.Role.EMPLOYEE) {
            return complaint.getAssignedEmployee() != null &&
                    complaint.getAssignedEmployee().getId().equals(user.getId()) ||
                    complaint.getEscalatedTo() != null &&
                            complaint.getEscalatedTo().getId().equals(user.getId());
        }

        return complaint.getUser() != null &&
                complaint.getUser().getId().equals(user.getId());
    }
}