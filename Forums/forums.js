async function getForumData() {
    const response = await fetch("forumData.json");

    if (!response.ok) {
        throw new Error("Could not load forumData.json");
    }

    return await response.json();
}

function formatTimestamp(timestamp) {

    const date = new Date(timestamp);

    return date.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });

}

function showForumError(message) {
    const fallback =
        document.getElementById("threadPage") ||
        document.getElementById("threadList");

    if (fallback) {
        fallback.innerHTML = `
            <div class="forumPost">
                <div class="postContent">
                    <p>${message}</p>
                </div>
            </div>
        `;
    }
}

async function loadCategory(categoryId) {
    try {
        const data = await getForumData();
        const category = data.categories[categoryId];

        if (!category) {
            showForumError("Category not found.");
            return;
        }

        document.getElementById("categoryTitle").textContent = category.title;
        document.getElementById("categoryDescription").textContent = category.description;

        const threadList = document.getElementById("threadList");
        threadList.innerHTML = "";

        const savedThreads =
            JSON.parse(localStorage.getItem("customThreads")) || {};

        const customThreads = savedThreads[categoryId] || [];

        const allThreads = [
            ...customThreads,
            ...category.threads
        ];

        allThreads.forEach(thread => {
            const threadCard = document.createElement("a");

            threadCard.className = "threadCard";
            threadCard.href = `thread.html?category=${categoryId}&thread=${thread.id}`;

            threadCard.innerHTML = `
                <div class="threadInfo">
                    <h2>${thread.title}</h2>
                    <p>${thread.preview}</p>
                </div>

                <div class="threadMeta">
                    <span>${thread.replies} Replies</span>
                </div>
            `;

            threadList.appendChild(threadCard);
        });

    } catch (error) {
        console.error(error);
        showForumError("Forum data could not be loaded. Make sure you are using Live Server.");
    }
}

async function loadThread() {
    try {
        const params = new URLSearchParams(window.location.search);

        let categoryId = params.get("category");
        let threadId = params.get("thread");

        const data = await getForumData();

        if (!categoryId || !threadId) {
            categoryId = "general";
            threadId = "favorite-weapon";
        }

        const category = data.categories[categoryId];

        const savedThreads =
            JSON.parse(localStorage.getItem("customThreads")) || {};

        const customThreads = savedThreads[categoryId] || [];

        const allThreads = [
            ...customThreads,
            ...category.threads
        ];

        const thread = allThreads.find(t => t.id === threadId);

        if (!thread) {
            showForumError("Thread not found.");
            return;
        }

        document.getElementById("threadTitle").textContent = thread.title;
        document.getElementById("threadSubtitle").textContent =
            `Posted in ${category.title} by ${thread.author}`;

        const savedReplies =
            JSON.parse(localStorage.getItem("customReplies")) || {};

        const replyKey = `${categoryId}-${threadId}`;
        const customReplies = savedReplies[replyKey] || [];

        const allPosts = [
            ...thread.posts,
            ...customReplies
        ];

        const threadPage = document.getElementById("threadPage");
        threadPage.innerHTML = "";

        allPosts.forEach((post, index) => {
            const postDiv = document.createElement("div");

            postDiv.className = index === 0 ? "forumPost" : "forumReply";

            postDiv.innerHTML = `
                <div class="postAuthor">
                    <img src="../resources/defaultProfile.png" alt="User Profile">

                    <div>
                        <h3>${post.author}</h3>

                        <div class="postTimestamp">
                            ${formatTimestamp(post.createdAt)}
                        </div>
                    </div>
                </div>

                <div class="postContent">
                    <p>${post.content}</p>
                </div>
            `;

            threadPage.appendChild(postDiv);
        });

    } catch (error) {
        console.error(error);
        showForumError("Thread could not be loaded.");
    }
}

let latestForumThreads = [];
let latestForumIndex = 0;
const latestForumBatchSize = 5;

async function loadLatestForumsPage() {
    const list = document.getElementById("latestForumList");
    const button = document.getElementById("loadMoreThreads");

    if (!list || !button) {
        return;
    }

    const data = await getForumData();

    latestForumThreads = [];

    Object.entries(data.categories).forEach(([categoryId, category]) => {
        category.threads.forEach(thread => {
            latestForumThreads.push({
                categoryId: categoryId,
                categoryTitle: category.title,
                id: thread.id,
                title: thread.title,
                preview: thread.preview,
                replies: thread.replies,
                author: thread.author,
                createdAt: thread.createdAt || "2026-01-01T00:00:00"
            });
        });
    });

    latestForumThreads.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    latestForumIndex = 0;
    list.innerHTML = "";

    renderNextLatestThreads();

    button.addEventListener("click", renderNextLatestThreads);

    window.addEventListener("scroll", () => {
        const nearBottom =
            window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;

        if (nearBottom) {
            renderNextLatestThreads();
        }
    });
}

function renderNextLatestThreads() {
    const list = document.getElementById("latestForumList");
    const button = document.getElementById("loadMoreThreads");

    const nextThreads = latestForumThreads.slice(
        latestForumIndex,
        latestForumIndex + latestForumBatchSize
    );

    nextThreads.forEach(thread => {
        const card = document.createElement("a");

        card.className = "threadCard";
        card.href = `thread.html?category=${thread.categoryId}&thread=${thread.id}`;

        threadCard.innerHTML = `
            <div class="threadInfo">
                <h2>${thread.title}</h2>

                <p>${thread.preview}</p>

                <div class="threadTimestamp">
                    Last Activity:
                    ${formatTimestamp(
                        thread.lastActivity || thread.createdAt
                    )}
                </div>
            </div>

            <div class="threadMeta">
                <span>${thread.replies} Replies</span>
            </div>
        `;

        list.appendChild(card);
    });

    latestForumIndex += latestForumBatchSize;

    if (latestForumIndex >= latestForumThreads.length) {
        button.style.display = "none";
    }
}

function createThread(categoryId) {
    const titleInput = document.getElementById("newThreadTitle");
    const contentInput = document.getElementById("newThreadContent");

    if (!titleInput || !contentInput) {
        return;
    }

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title || !content) {
        alert("Please enter a title and message.");
        return;
    }

    const savedThreads =
        JSON.parse(localStorage.getItem("customThreads")) || {};

    if (!savedThreads[categoryId]) {
        savedThreads[categoryId] = [];
    }

    const id =
        title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") +
        "-" +
        Date.now();

    const now = new Date().toISOString();

    const newThread = {
        id: id,
        title: title,
        preview: content.length > 120 ? content.slice(0, 120) + "..." : content,
        replies: 0,
        author: "Guest",
        createdAt: now,
        lastActivity: now,
        posts: [
            {
                author: "Guest",
                content: content,
                createdAt: now
            }
        ]
    };

    savedThreads[categoryId].unshift(newThread);

    localStorage.setItem("customThreads", JSON.stringify(savedThreads));

    window.location.href = `thread.html?category=${categoryId}&thread=${id}`;
}

function addReply() {
    const contentBox = document.getElementById("replyContent");
    thread.lastActivity = now;
    threadActivity[threadId] = now;
    if (!contentBox) {
        return;
    }

    const content = contentBox.value.trim();

    if (!content) {
        alert("Please enter a reply.");
        return;
    }

    const params = new URLSearchParams(window.location.search);

    const categoryId = params.get("category") || "general";
    const threadId = params.get("thread") || "favorite-weapon";

    const savedReplies =
        JSON.parse(localStorage.getItem("customReplies")) || {};

    const replyKey = `${categoryId}-${threadId}`;

    if (!savedReplies[replyKey]) {
        savedReplies[replyKey] = [];
    }

    const now = new Date().toISOString();

    savedReplies[replyKey].push({
        author: "Guest",
        content: content,
        createdAt: now
    });

    localStorage.setItem("customReplies", JSON.stringify(savedReplies));

    contentBox.value = "";

    loadThread();
}

document.querySelectorAll(".forumCard").forEach(card => {
    card.addEventListener("mousemove", e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateY = ((x - centerX) / centerX) * 10;
        const rotateX = ((centerY - y) / centerY) * 10;

        const mouseX = (x / rect.width) * 100;
        const mouseY = (y / rect.height) * 100;

        card.style.transform = `translateY(-4px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

        card.style.setProperty("--mouse-x", `${mouseX}%`);
        card.style.setProperty("--mouse-y", `${mouseY}%`);

        card.style.setProperty("--opposite-x", `${100 - mouseX}%`);
        card.style.setProperty("--opposite-y", `${100 - mouseY}%`);
    });

    card.addEventListener("mouseleave", () => {
        card.style.transform = "";
        card.style.removeProperty("--mouse-x");
        card.style.removeProperty("--mouse-y");
        card.style.removeProperty("--opposite-x");
        card.style.removeProperty("--opposite-y");
    });
});