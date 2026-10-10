"use strict";

const $ = (id) => document.getElementById(id);
const STORAGE = "studenthub_brightfuture_v1";

const samples = [
  { id: "p1", name: "Amara", subject: "Mathematics", school: "Secondary learner", bio: "Practising a little every day. Let's solve problems together!", color: "#e9d9ff" },
  { id: "p2", name: "Noah", subject: "Science", school: "Science enthusiast", bio: "Curious about how the world works. Always ready to learn.", color: "#f9d8eb" },
  { id: "p3", name: "Zara", subject: "English", school: "Language learner", bio: "Reading, writing and helping friends improve their English.", color: "#ffe2cf" },
  { id: "p4", name: "Ethan", subject: "Computer Studies", school: "Tech enthusiast", bio: "Exploring technology and building new skills.", color: "#d9edff" }
];

const starterPosts = [
  { id: "s1", name: "Amara", text: "A reminder for today: you don't need to understand everything at once. Keep asking questions and keep practising. 💜", likes: 2, liked: false, time: "Welcome to StudentHub", sample: true },
  { id: "s2", name: "Noah", text: "What is one subject you want to improve this term? Let's motivate each other! 🌷", likes: 4, liked: false, time: "Welcome to StudentHub", sample: true }
];

let state = loadState();
let activeChat = null;
let toastTimer;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE));
    if (saved && typeof saved === "object") return saved;
  } catch (error) {
    console.warn("Saved demo data could not be read.", error);
  }
  return { user: null, posts: [], requests: [], accepted: [], messages: {}, likes: [] };
}

function persist() {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(state));
    return true;
  } catch (error) {
    notify("Browser storage is unavailable. Changes may not be saved.");
    return false;
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[character]);
}

function initial(name) {
  return (name || "S").trim().charAt(0).toUpperCase() || "S";
}

function notify(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function currentUser() {
  return state.user;
}

function requireLogin() {
  if (currentUser()) return true;
  openAuth();
  notify("Join StudentHub to use this feature.");
  return false;
}

function openAuth() {
  $("authModal").classList.remove("hidden");
  $("authName").focus();
}

function closeAuth() {
  $("authModal").classList.add("hidden");
}

function renderUser() {
  const user = currentUser();
  $("welcome").textContent = user ? "Hello, " + user.name + " ✨" : "Your student community ✨";
  $("accountBtn").classList.toggle("hidden", !!user);
  $("logoutBtn").classList.toggle("hidden", !user);
  $("myName").textContent = user ? user.name : "Guest learner";
  $("mySchool").textContent = user ? (user.school || user.subject || "StudentHub member") : "Your learning journey starts here";
  $("myAvatar").textContent = initial(user ? user.name : "Student");
  $("profileName").value = user ? user.name : "";
  $("profileSchool").value = user ? user.school : "";
  $("profileSubject").value = user ? user.subject : "";
  $("profileBio").value = user ? user.bio : "";
}

function renderPosts() {
  const posts = [...starterPosts, ...state.posts];
  $("feedList").innerHTML = posts.map((post) => {
    const liked = post.sample
      ? !!(state.likes || []).includes(post.id)
      : !!post.liked;
    const likes = post.sample
      ? post.likes + (liked ? 1 : 0)
      : post.likes;

    return `
      <article class="card post">
        <div class="post-header">
          <div class="avatar">${escapeHTML(initial(post.name))}</div>
          <div>
            <strong>${escapeHTML(post.name)}</strong>
            <small>${escapeHTML(post.time || "Community post")}</small>
          </div>
          <span>🌷</span>
        </div>
        <div class="post-text">${escapeHTML(post.text)}</div>
        <div class="post-actions">
          <button class="soft-btn ${liked ? "liked" : ""}"
            data-like="${escapeHTML(post.id)}" aria-pressed="${liked}">
            ${liked ? "♥ Liked" : "♡ Like"} · ${likes}
          </button>
          <button class="soft-btn" data-page-link="discover">Find study friends →</button>
        </div>
      </article>`;
  }).join("");
}

function friendStatus(id) {
  if ((state.accepted || []).includes(id)) return "connected";
  if ((state.requests || []).includes(id)) return "pending";
  return "new";
}

function personCard(person, forChat = false) {
  const status = friendStatus(person.id);
  let action = "";

  if (forChat) {
    action = `<button class="btn btn-primary" data-chat="${person.id}">Message ${escapeHTML(person.name)}</button>`;
  } else if (status === "connected") {
    action = `<button class="btn btn-primary" data-chat="${person.id}">Message friend</button>`;
  } else if (status === "pending") {
    action = `<button class="soft-btn" disabled>Request sent ✓</button>`;
  } else {
    action = `<button class="btn btn-primary" data-friend="${person.id}">Add study friend +</button>`;
  }

  return `
    <article class="card person">
      <div class="person-top">
        <div class="avatar" style="background:${person.color}">${escapeHTML(initial(person.name))}</div>
        <div>
          <strong>${escapeHTML(person.name)}</strong>
          <small>${escapeHTML(person.school || "Learner")}</small>
        </div>
      </div>
      <p><strong>Favourite:</strong> ${escapeHTML(person.subject)}<br>${escapeHTML(person.bio)}</p>
      ${action}
    </article>`;
}

function renderPeople() {
  const search = ($("friendSearch").value || "").trim().toLowerCase();
  const people = samples.filter((person) => {
    const isMe = currentUser() &&
      person.name.toLowerCase() === currentUser().name.toLowerCase();
    const matches = [person.name, person.subject, person.school, person.bio]
      .join(" ").toLowerCase().includes(search);
    return !isMe && matches;
  });

  $("peopleList").innerHTML = people.length
    ? people.map((person) => personCard(person)).join("")
    : '<div class="card empty-state">No sample learners found. Try another search.</div>';

  $("chatPeople").innerHTML = samples
    .filter((person) => !(currentUser() && person.name.toLowerCase() === currentUser().name.toLowerCase()))
    .map((person) => personCard(person, true)).join("");
}

function renderChat() {
  const user = samples.find((person) => person.id === activeChat);
  if (!user) {
    $("chatNotice").classList.remove("hidden");
    $("chatArea").classList.add("hidden");
    return;
  }

  $("chatNotice").classList.add("hidden");
  $("chatArea").classList.remove("hidden");
  $("chatTitle").textContent = "💜 Conversation with " + user.name;

  const messages = (state.messages || {})[user.id] || [];
  $("chatLog").innerHTML = messages.length
    ? messages.map((message) => `
      <div class="bubble ${message.mine ? "mine" : ""}">
        ${escapeHTML(message.text)}
        <small>${escapeHTML(message.mine ? (currentUser()?.name || "You") : user.name)}
          · ${escapeHTML(message.time)}</small>
      </div>`).join("")
    : '<p class="muted small">Say hello and start a friendly conversation! 🌷</p>';

  $("chatLog").scrollTop = $("chatLog").scrollHeight;
  $("msgCount").textContent = messages.filter((message) => message.mine).length ? "♥" : "";
}

function navigate(page) {
  const validPages = ["feed", "discover", "messages", "resources", "profile"];
  if (!validPages.includes(page)) return;

  document.querySelectorAll(".page").forEach((element) => element.classList.add("hidden"));
  $(page + "Page").classList.remove("hidden");

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  if (page === "profile") renderUser();
  if (page === "discover" || page === "messages") renderPeople();
  if (page === "messages") renderChat();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("accountBtn").addEventListener("click", openAuth);
$("heroJoin").addEventListener("click", openAuth);
$("closeModal").addEventListener("click", closeAuth);

$("authModal").addEventListener("click", (event) => {
  if (event.target === $("authModal")) closeAuth();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeAuth();
});

$("authForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const name = $("authName").value.trim();
  if (!name) return notify("Please choose a display name.");

  state.user = {
    name,
    school: $("authSchool").value.trim(),
    subject: $("authSubject").value.trim(),
    bio: ""
  };

  persist();
  renderUser();
  renderPeople();
  closeAuth();
  $("authForm").reset();
  notify("Welcome to StudentHub, " + name + "! ✨");
});

$("logoutBtn").addEventListener("click", () => {
  state.user = null;
  activeChat = null;
  persist();
  renderUser();
  renderPeople();
  renderChat();
  navigate("feed");
  notify("You have left the demo profile.");
});

document.querySelectorAll(".nav-btn").forEach((button) => {
  button.addEventListener("click", () => navigate(button.dataset.page));
});

$("profileForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!requireLogin()) return;

  state.user = {
    name: $("profileName").value.trim(),
    school: $("profileSchool").value.trim(),
    subject: $("profileSubject").value.trim(),
    bio: $("profileBio").value.trim()
  };

  persist();
  renderUser();
  renderPeople();
  notify("Your profile has been updated! 🌸");
});

$("postForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!requireLogin()) return;

  const text = $("postText").value.trim();
  if (!text) return;

  state.posts.unshift({
    id: "post-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    name: currentUser().name,
    text,
    likes: 0,
    liked: false,
    time: new Date().toLocaleString()
  });

  persist();
  $("postText").value = "";
  renderPosts();
  notify("Your post is now in your local feed! 💜");
});

$("friendSearch").addEventListener("input", renderPeople);

document.addEventListener("click", (event) => {
  const likeButton = event.target.closest("[data-like]");
  if (likeButton) {
    if (!requireLogin()) return;

    const id = likeButton.dataset.like;
    const post = state.posts.find((item) => item.id === id);

    if (post) {
      post.liked = !post.liked;
      post.likes = Math.max(0, post.likes + (post.liked ? 1 : -1));
    } else {
      state.likes = state.likes || [];
      state.likes = state.likes.includes(id)
        ? state.likes.filter((item) => item !== id)
        : [...state.likes, id];
    }

    persist();
    renderPosts();
    return;
  }

  const friendButton = event.target.closest("[data-friend]");
  if (friendButton) {
    if (!requireLogin()) return;

    const id = friendButton.dataset.friend;
    if (friendStatus(id) !== "new") return;

    state.requests.push(id);
    persist();
    renderPeople();
    notify("Study-friend request saved in this browser demo.");
    return;
  }

  const chatButton = event.target.closest("[data-chat]");
  if (chatButton) {
    if (!requireLogin()) return;

    activeChat = chatButton.dataset.chat;
    navigate("messages");
    renderChat();
    $("chatInput").focus();
    return;
  }

  const pageButton = event.target.closest("[data-page-link]");
  if (pageButton) {
    navigate(pageButton.dataset.pageLink);
    return;
  }

  const tipButton = event.target.closest("[data-tip]");
  if (tipButton) {
    const tips = {
      study: "Try 25 minutes of focused learning, then take a short break. Close your notes and explain the idea in your own words.",
      plan: "Write down three priorities for tomorrow. Give each a time and leave a little space for unexpected tasks.",
      friends: "Take turns explaining a topic, then quiz one another with practice questions. Encourage each other without sharing private information."
    };
    $("tipBox").textContent = tips[tipButton.dataset.tip];
    $("tipBox").classList.remove("hidden");
  }
});

$("chatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!requireLogin()) return;

  const text = $("chatInput").value.trim();
  if (!text || !activeChat) return;

  state.messages = state.messages || {};
  state.messages[activeChat] = state.messages[activeChat] || [];
  state.messages[activeChat].push({
    text,
    mine: true,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });

  persist();
  $("chatInput").value = "";
  renderChat();
  notify("Message saved in your local demo.");
});

renderUser();
renderPosts();
renderPeople();
renderChat();// STUDENTHUB — INTERACTIVE STUDY CORNER
(() => {
  function initialiseStudyCorner() {
    const get = (id) => document.getElementById(id);

    // Stop safely if the Study Corner HTML is not on this page.
    if (!get("focusMinutes") || !get("startTimer")) return;

    const storage = {
      focus: "studenthubStudyFocus",
      points: "studenthubStudyPoints",
      notes: "studenthubStudyNotes",
      challenge: "studenthubStudyChallenge"
    };

    function readNumber(key) {
      return Math.max(0, Number(localStorage.getItem(key)) || 0);
    }

    function updateStats() {
      get("focusMinutes").textContent = readNumber(storage.focus);
      get("quizPoints").textContent = readNumber(storage.points);

      try {
        get("notesCount").textContent =
          JSON.parse(localStorage.getItem(storage.notes) || "[]").length;
      } catch {
        get("notesCount").textContent = "0";
      }
    }

    // FOCUS TIMER
    let remainingSeconds = 25 * 60;
    let timerInterval = null;

    function displayTimer() {
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;

      get("timerDisplay").textContent =
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0");
    }

    function stopTimer() {
      if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
      }

      get("startTimer").textContent = "Start";
    }

    get("timerLength").addEventListener("change", () => {
      if (timerInterval !== null) return;

      remainingSeconds = Number(get("timerLength").value) * 60;
      get("timerMessage").textContent = "Ready when you are!";
      displayTimer();
    });

    get("startTimer").addEventListener("click", () => {
      if (timerInterval !== null) {
        stopTimer();
        get("timerMessage").textContent = "Paused. Resume when ready.";
        return;
      }

      if (remainingSeconds <= 0) {
        remainingSeconds = Number(get("timerLength").value) * 60;
      }

      get("startTimer").textContent = "Pause";
      get("timerMessage").textContent = "You're doing great. Stay focused!";

      timerInterval = setInterval(() => {
        remainingSeconds--;
        displayTimer();

        if (remainingSeconds <= 0) {
          stopTimer();

          const sessionMinutes = Number(get("timerLength").value);
          localStorage.setItem(
            storage.focus,
            readNumber(storage.focus) + sessionMinutes
          );

          get("timerMessage").textContent =
            "Session complete! Take a short break. 🎉";

          updateStats();
        }
      }, 1000);
    });

    get("resetTimer").addEventListener("click", () => {
      stopTimer();
      remainingSeconds = Number(get("timerLength").value) * 60;
      get("timerMessage").textContent = "Timer reset. Ready for another session!";
      displayTimer();
    });

    // QUICK QUIZ
    const questions = [
      {
        question: "Which planet is known as the Red Planet?",
        answers: ["Venus", "Mars", "Jupiter", "Mercury"],
        correct: 1,
        explanation: "Mars looks reddish because of iron-rich material on its surface."
      },
      {
        question: "What is 12 × 8?",
        answers: ["86", "92", "96", "108"],
        correct: 2,
        explanation: "12 multiplied by 8 equals 96."
      },
      {
        question: "Which gas do plants absorb during photosynthesis?",
        answers: ["Oxygen", "Carbon dioxide", "Hydrogen", "Helium"],
        correct: 1,
        explanation: "Plants use carbon dioxide, water and light to make sugars."
      },
      {
        question: "Which language gives a webpage its basic structure?",
        answers: ["HTML", "CSS", "SQL", "Photoshop"],
        correct: 0,
        explanation: "HTML organises the content and structure of a webpage."
      },
      {
        question: "What is the chemical symbol for water?",
        answers: ["CO₂", "O₂", "H₂O", "NaCl"],
        correct: 2,
        explanation: "A water molecule contains two hydrogen atoms and one oxygen atom."
      }
    ];

    let questionIndex = 0;
    let questionAnswered = false;

    function showQuestion() {
      const question = questions[questionIndex];
      questionAnswered = false;

      get("quizQuestion").textContent = question.question;
      get("quizFeedback").textContent = "Choose your answer!";

      const answersBox = get("quizAnswers");
      answersBox.replaceChildren();

      question.answers.forEach((answer, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "quiz-option";
        button.textContent = answer;

        button.addEventListener("click", () => {
          if (questionAnswered) return;

          questionAnswered = true;
          const isCorrect = index === question.correct;

          answersBox.querySelectorAll("button").forEach((option, i) => {
            option.disabled = true;

            if (i === question.correct) {
              option.classList.add("answer-correct");
            } else if (i === index && !isCorrect) {
              option.classList.add("answer-wrong");
            }
          });

          if (isCorrect) {
            localStorage.setItem(
              storage.points,
              readNumber(storage.points) + 1
            );

            get("quizFeedback").textContent =
              "Correct! " + question.explanation;
          } else {
            get("quizFeedback").textContent =
              "Not quite. " + question.explanation;
          }

          updateStats();
        });

        answersBox.appendChild(button);
      });
    }

    get("nextQuestion").addEventListener("click", () => {
      questionIndex = (questionIndex + 1) % questions.length;
      showQuestion();
    });

    // DAILY CHALLENGE
    const today = new Date();
    const todayKey = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0")
    ].join("-");

    function updateChallenge() {
      const completed =
        localStorage.getItem(storage.challenge) === todayKey;

      get("completeChallenge").textContent =
        completed ? "Completed ✓" : "Mark completed ✓";

      get("challengeFeedback").textContent = completed
        ? "Well done! You've completed today's challenge. 🌟"
        : "Every little effort counts.";
    }

    get("completeChallenge").addEventListener("click", () => {
      const completed =
        localStorage.getItem(storage.challenge) === todayKey;

      if (completed) {
        get("challengeFeedback").textContent =
          "You've already completed today's challenge. Keep it up!";
        return;
      }

      localStorage.setItem(storage.challenge, todayKey);
      updateChallenge();
    });

    // PERSONAL REVISION NOTES
    function readNotes() {
      try {
        const notes = JSON.parse(localStorage.getItem(storage.notes) || "[]");
        return Array.isArray(notes) ? notes : [];
      } catch {
        return [];
      }
    }

    function renderNotes() {
      const notes = readNotes();
      const container = get("savedNotes");
      container.replaceChildren();

      if (notes.length === 0) {
        const message = document.createElement("p");
        message.className = "muted small";
        message.textContent = "Your saved notes will appear here.";
        container.appendChild(message);
      }

      notes.forEach((note, index) => {
        const card = document.createElement("article");
        card.className = "saved-note";

        const title = document.createElement("h4");
        title.textContent = note.title;

        const content = document.createElement("p");
        content.textContent = note.content;

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.textContent = "Delete note";

        removeButton.addEventListener("click", () => {
          const updatedNotes = readNotes();
          updatedNotes.splice(index, 1);
          localStorage.setItem(storage.notes, JSON.stringify(updatedNotes));
          renderNotes();
          updateStats();
        });

        card.append(title, content, removeButton);
        container.appendChild(card);
      });
    }

    get("saveNote").addEventListener("click", () => {
      const title = get("noteTitle").value.trim();
      const content = get("noteContent").value.trim();

      if (!title || !content) {
        get("noteFeedback").textContent =
          "Please enter both a title and your notes.";
        return;
      }

      const notes = readNotes();
      notes.unshift({ title, content });

      try {
        localStorage.setItem(storage.notes, JSON.stringify(notes));
        get("noteTitle").value = "";
        get("noteContent").value = "";
        get("noteFeedback").textContent = "Note saved on this device! ✓";
        renderNotes();
        updateStats();
      } catch {
        get("noteFeedback").textContent =
          "Could not save the note. Your browser storage may be full.";
      }
    });

    displayTimer();
    showQuestion();
    updateChallenge();
    renderNotes();
    updateStats();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiseStudyCorner);
  } else {
    initialiseStudyCorner();
  }
})();
(() => {
  function setupStudyCorner() {
    const $ = id => document.getElementById(id);

    if (!$("createQuizForm") || !$("startTimer")) return;

    const keys = {
      notes: "studenthub_notes_v2",
      quizzes: "studenthub_quizzes_v2",
      focus: "studenthub_focus_v2"
    };

    function read(key, fallback) {
      try {
        const value = JSON.parse(localStorage.getItem(key));
        return value ?? fallback;
      } catch {
        return fallback;
      }
    }

    function write(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }

    function updateStats() {
      $("focusMinutes").textContent = read(keys.focus, 0);
      $("notesCount").textContent = read(keys.notes, []).length;
      $("myQuizCount").textContent = read(keys.quizzes, []).length;
    }

    // FOCUS TIMER
    let remaining = 25 * 60;
    let interval = null;
    let lastTick = 0;
    let sessionSeconds = 0;

    function showTimer() {
      const min = Math.floor(remaining / 60);
      const sec = remaining % 60;
      $("timerDisplay").textContent =
        String(min).padStart(2, "0") + ":" +
        String(sec).padStart(2, "0");
    }

    function pauseTimer(message) {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }

      $("startTimer").textContent = "Resume";
      if (message) $("timerMessage").textContent = message;
    }

    function timerTick() {
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - lastTick) / 1000));
      if (!elapsed) return;

      lastTick += elapsed * 1000;
      remaining = Math.max(0, remaining - elapsed);
      sessionSeconds += elapsed;
      showTimer();

      if (remaining === 0) {
        clearInterval(interval);
        interval = null;

        const minutes = Math.floor(sessionSeconds / 60);
        if (minutes > 0) {
          write(keys.focus, read(keys.focus, 0) + minutes);
        }

        sessionSeconds = 0;
        $("startTimer").textContent = "Start";
        $("timerMessage").textContent =
          "Session complete! Take a short break.";
        updateStats();
      }
    }

    $("timerLength").addEventListener("change", () => {
      if (interval !== null) return;
      remaining = Number($("timerLength").value) * 60;
      sessionSeconds = 0;
      showTimer();
      $("timerMessage").textContent = "Ready when you are!";
    });

    $("startTimer").addEventListener("click", () => {
      if (interval !== null) {
        pauseTimer("Timer paused. Resume when you're ready.");
        return;
      }

      if (remaining <= 0) {
        remaining = Number($("timerLength").value) * 60;
        sessionSeconds = 0;
      }

      lastTick = Date.now();
      interval = setInterval(timerTick, 250);
      $("startTimer").textContent = "Pause";
      $("timerMessage").textContent = "Focus time has started!";
    });

    $("resetTimer").addEventListener("click", () => {
      if (interval !== null) clearInterval(interval);
      interval = null;
      remaining = Number($("timerLength").value) * 60;
      sessionSeconds = 0;
      $("startTimer").textContent = "Start";
      $("timerMessage").textContent = "Timer reset.";
      showTimer();
    });

    // SAVED NOTES
    function renderNotes() {
      const notes = read(keys.notes, []);
      const box = $("savedNotes");
      box.replaceChildren();

      if (!notes.length) {
        const p = document.createElement("p");
        p.className = "muted";
        p.textContent = "No saved notes yet. Create your first note above.";
        box.appendChild(p);
      }

      notes.forEach((note, index) => {
        const card = document.createElement("article");
        card.className = "saved-note";

        const title = document.createElement("h4");
        title.textContent = note.title;

        const body = document.createElement("p");
        body.textContent = note.content;

        const date = document.createElement("p");
        date.className = "muted small";
        date.textContent = "Saved: " + note.date;

        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Delete note";
        remove.addEventListener("click", () => {
          const updated = read(keys.notes, []);
          updated.splice(index, 1);

          if (write(keys.notes, updated)) {
            renderNotes();
            updateStats();
          } else {
            $("noteFeedback").textContent = "Could not update saved notes.";
          }
        });

        card.append(title, body, date, remove);
        box.appendChild(card);
      });
    }

    $("noteForm").addEventListener("submit", event => {
      event.preventDefault();

      const title = $("noteTitle").value.trim();
      const content = $("noteContent").value.trim();

      if (!title || !content) {
        $("noteFeedback").textContent = "Please complete both fields.";
        return;
      }

      const notes = read(keys.notes, []);
      notes.unshift({
        title,
        content,
        date: new Date().toLocaleString()
      });

      if (!write(keys.notes, notes)) {
        $("noteFeedback").textContent =
          "Saving failed. Check your browser storage settings.";
        return;
      }

      $("noteForm").reset();
      $("noteFeedback").textContent = "Your note has been saved!";
      renderNotes();
      updateStats();
    });

    // STUDENT-CREATED QUIZZES
    $("createQuizForm").addEventListener("submit", event => {
      event.preventDefault();

      const title = $("newQuizTitle").value.trim();
      const question = $("newQuizQuestion").value.trim();
      const options = [1, 2, 3, 4].map(n =>
        $("quizOption" + n).value.trim()
      );
      const correct = Number($("correctQuizAnswer").value);

      if (!title || !question || options.some(option => !option)) {
        $("quizSaveMessage").textContent =
          "Please complete the title, question and all four choices.";
        return;
      }

      if (new Set(options.map(option => option.toLowerCase())).size !== 4) {
        $("quizSaveMessage").textContent =
          "Please make all four choices different.";
        return;
      }

      const quizzes = read(keys.quizzes, []);
      quizzes.unshift({
        id: Date.now().toString(),
        title,
        question,
        options,
        correct
      });

      if (!write(keys.quizzes, quizzes)) {
        $("quizSaveMessage").textContent =
          "The quiz could not be saved. Check browser storage.";
        return;
      }

      $("createQuizForm").reset();
      $("correctQuizAnswer").value = "0";
      $("quizSaveMessage").textContent =
        "Quiz saved! You can take it below.";
      renderQuizzes();
      updateStats();
    });

    function renderQuizzes() {
      const quizzes = read(keys.quizzes, []);
      const box = $("savedQuizzes");
      box.replaceChildren();

      if (!quizzes.length) {
        const p = document.createElement("p");
        p.className = "muted";
        p.textContent = "No quizzes yet. Create one above to get started.";
        box.appendChild(p);
      }

      quizzes.forEach(quiz => {
        const card = document.createElement("article");
        card.className = "saved-quiz";

        const title = document.createElement("h4");
        title.textContent = quiz.title;

        const question = document.createElement("p");
        question.textContent = quiz.question;

        const choices = document.createElement("div");
        choices.setAttribute("role", "group");
        choices.setAttribute("aria-label", "Quiz answer choices");

        const feedback = document.createElement("p");
        feedback.className = "quiz-feedback";
        feedback.setAttribute("aria-live", "polite");
        feedback.hidden = true;

        let answered = false;

        quiz.options.forEach((option, index) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "quiz-choice";
          button.textContent = option;

          button.addEventListener("click", () => {
            if (answered) return;
            answered = true;

            if (index === quiz.correct) {
              feedback.textContent = "Correct! Well done.";
            } else {
              feedback.textContent =
                "Not quite. Correct answer: " + quiz.options[quiz.correct];
            }

            feedback.hidden = false;
            choices.querySelectorAll("button").forEach(item => {
              item.disabled = true;
            });
          });

          choices.appendChild(button);
        });

        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Delete quiz";

        remove.addEventListener("click", () => {
          const updated = read(keys.quizzes, [])
            .filter(item => item.id !== quiz.id);

          if (write(keys.quizzes, updated)) {
            renderQuizzes();
            updateStats();
          }
        });

        card.append(title, question, choices, feedback, remove);
        box.appendChild(card);
      });
    }

    showTimer();
    renderNotes();
    renderQuizzes();
    updateStats();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupStudyCorner);
  } else {
    setupStudyCorner();
  }
})();