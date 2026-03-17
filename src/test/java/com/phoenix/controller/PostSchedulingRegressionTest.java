package com.phoenix.controller;

import com.phoenix.dto.PostRequest;
import com.phoenix.dto.PostResponse;
import com.phoenix.entity.Post;
import com.phoenix.entity.PostStatus;
import com.phoenix.entity.User;
import com.phoenix.entity.UserRole;
import com.phoenix.repository.PostRepository;
import com.phoenix.repository.UserRepository;
import com.phoenix.service.PostService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class PostSchedulingRegressionTest {

    @MockBean
    private JavaMailSender javaMailSender;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PostService postService;

    @BeforeEach
    void setUp() {
        postRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void scheduledDraftRemainsHiddenUntilDueThenBecomesVisible() throws Exception {
        User author = createUser("sched-author@example.com", "Sched Author");

        LocalDateTime nowUtc = LocalDateTime.now(ZoneOffset.UTC);

        PostResponse futureCreated = createScheduledViaService(author.getEmail(), "Future Scheduled", nowUtc.plusMinutes(10));
        PostResponse dueCreated = createScheduledViaService(author.getEmail(), "Due Scheduled", nowUtc.plusMinutes(10));

        Post futureScheduled = postRepository.findById(Objects.requireNonNull(futureCreated.getId())).orElseThrow();
        Post dueScheduled = postRepository.findById(Objects.requireNonNull(dueCreated.getId())).orElseThrow();

        // Force one post to be due for scheduler pickup.
        dueScheduled.setScheduledPublishAt(nowUtc.minusMinutes(2));
        dueScheduled.setStatus(PostStatus.DRAFT);
        postRepository.save(dueScheduled);

        assertThat(futureScheduled.getStatus()).isEqualTo(PostStatus.DRAFT);
        assertThat(dueScheduled.getStatus()).isEqualTo(PostStatus.DRAFT);

        postService.publishScheduledPosts();

        Post refreshedFuture = postRepository.findById(Objects.requireNonNull(futureScheduled.getId())).orElseThrow();
        Post refreshedDue = postRepository.findById(Objects.requireNonNull(dueScheduled.getId())).orElseThrow();

        assertThat(refreshedFuture.getStatus()).isEqualTo(PostStatus.DRAFT);
        assertThat(refreshedFuture.getScheduledPublishAt()).isNotNull();
        assertThat(refreshedDue.getStatus()).isEqualTo(PostStatus.PUBLISHED);
        assertThat(refreshedDue.getScheduledPublishAt()).isNull();
    }

    private User createUser(String email, String name) {
        User user = User.builder()
                .email(email)
                .password("password")
                .name(name)
                .role(UserRole.ROLE_USER)
                .build();
        return userRepository.save(Objects.requireNonNull(user));
    }

    private PostResponse createScheduledViaService(String authorEmail, String title, LocalDateTime scheduleAtUtc) {
        PostRequest request = new PostRequest();
        request.setTitle(title);
        request.setContent("content for " + title);
        request.setPremium(false);
        request.setPrice(0);
        request.setSaveAsDraft(false);
        request.setScheduledPublishAt(scheduleAtUtc);
        return postService.createPost(request, authorEmail);
    }
}
