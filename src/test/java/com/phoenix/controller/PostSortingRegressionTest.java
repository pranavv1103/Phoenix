package com.phoenix.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.phoenix.entity.Post;
import com.phoenix.entity.PostStatus;
import com.phoenix.entity.Reaction;
import com.phoenix.entity.ReactionType;
import com.phoenix.entity.User;
import com.phoenix.entity.UserRole;
import com.phoenix.repository.PostRepository;
import com.phoenix.repository.ReactionRepository;
import com.phoenix.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PostSortingRegressionTest {

    @MockBean
    private JavaMailSender javaMailSender;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReactionRepository reactionRepository;

    @BeforeEach
    void setUp() {
        reactionRepository.deleteAll();
        postRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void shouldSortByNewestAndOldestCorrectly() throws Exception {
        User author = createUser("author@example.com", "Author");

        createPublishedPost(author, "Oldest Post", LocalDateTime.of(2025, 1, 1, 10, 0));
        createPublishedPost(author, "Middle Post", LocalDateTime.of(2025, 1, 2, 10, 0));
        createPublishedPost(author, "Newest Post", LocalDateTime.of(2025, 1, 3, 10, 0));

        List<String> newestTitles = fetchTitlesForSort("newest");
        List<String> oldestTitles = fetchTitlesForSort("oldest");

        assertThat(newestTitles).containsExactly("Newest Post", "Middle Post", "Oldest Post");
        assertThat(oldestTitles).containsExactly("Oldest Post", "Middle Post", "Newest Post");
    }

    @Test
    void shouldSortMostLikedByLikeReactionsOnly() throws Exception {
        User author = createUser("author2@example.com", "Author 2");
        User userA = createUser("a@example.com", "A");
        User userB = createUser("b@example.com", "B");
        User userC = createUser("c@example.com", "C");

        Post top = createPublishedPost(author, "Top Liked", LocalDateTime.of(2025, 2, 1, 10, 0));
        Post second = createPublishedPost(author, "Second Liked", LocalDateTime.of(2025, 2, 2, 10, 0));
        Post nonLikeReaction = createPublishedPost(author, "Has Love Reaction", LocalDateTime.of(2025, 2, 3, 10, 0));

        reactionRepository.save(Objects.requireNonNull(Reaction.builder().post(top).user(userA).type(ReactionType.LIKE).build()));
        reactionRepository.save(Objects.requireNonNull(Reaction.builder().post(top).user(userB).type(ReactionType.LIKE).build()));
        reactionRepository.save(Objects.requireNonNull(Reaction.builder().post(second).user(userC).type(ReactionType.LIKE).build()));
        reactionRepository.save(Objects.requireNonNull(Reaction.builder().post(nonLikeReaction).user(userA).type(ReactionType.LOVE).build()));

        List<String> titles = fetchTitlesForSort("mostLiked");

        assertThat(titles).containsExactly("Top Liked", "Second Liked", "Has Love Reaction");
    }

    private List<String> fetchTitlesForSort(String sort) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/posts")
                        .param("sort", sort)
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        JsonNode content = root.path("data").path("content");

        List<String> titles = new ArrayList<>();
        for (JsonNode postNode : content) {
            titles.add(postNode.path("title").asText());
        }
        return titles;
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

    private Post createPublishedPost(User author, String title, LocalDateTime createdAt) {
        Post post = Post.builder()
                .title(title)
                .content("content for " + title)
                .author(author)
                .status(PostStatus.PUBLISHED)
                .createdAt(createdAt)
                .updatedAt(createdAt)
                .build();
        return postRepository.save(Objects.requireNonNull(post));
    }
}
