package com.resolveit.controller;

import com.resolveit.dto.InternalNoteRequest;
import com.resolveit.model.InternalNote;
import com.resolveit.model.User;
import com.resolveit.repository.UserRepository;
import com.resolveit.service.InternalNoteService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/complaints")
@RequiredArgsConstructor
@Slf4j
public class InternalNoteController {

    private final InternalNoteService internalNoteService;
    private final UserRepository userRepository;

    @PostMapping("/{id}/notes")
    public ResponseEntity<?> addNote(
            @PathVariable Long id,
            @RequestBody InternalNoteRequest request,
            Authentication authentication) {

        log.info("📝 Adding internal note to complaint {} by {}", id, authentication.getName());

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        InternalNote note = internalNoteService.addNote(id, request, user);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Note added successfully",
                "note", note
        ));
    }

    @GetMapping("/{id}/notes")
    public ResponseEntity<?> getNotes(
            @PathVariable Long id,
            Authentication authentication) {

        log.info("📋 Getting internal notes for complaint {}", id);

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<InternalNote> notes = internalNoteService.getNotes(id, user);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "notes", notes,
                "count", notes.size()
        ));
    }

    @GetMapping("/notes/mentions")
    public ResponseEntity<?> getMentions(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<InternalNote> mentions = internalNoteService.getMentions(user);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "mentions", mentions,
                "count", mentions.size()
        ));
    }

    @DeleteMapping("/notes/{id}")
    public ResponseEntity<?> deleteNote(
            @PathVariable Long id,
            Authentication authentication) {

        log.info("🗑️ Deleting internal note {}", id);

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        internalNoteService.deleteNote(id, user);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Note deleted successfully"
        ));
    }
}