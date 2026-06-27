// Header command terminal + search modal (command palette).
// Progressive enhancement: with no JS, the static prompt + nav links remain.
(function () {
  var dataEl = document.getElementById("posts-data");
  var posts = [];
  try {
    posts = JSON.parse((dataEl && dataEl.textContent) || "[]");
  } catch (e) {
    posts = [];
  }
  var terminalEl = document.getElementById("terminal");
  var author = (terminalEl && terminalEl.dataset.author) || "visitor";
  var resumeUrl = (terminalEl && terminalEl.dataset.resume) || "/resume.pdf";

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function go(href) {
    window.location.href = href;
  }
  function lcp(arr) {
    if (!arr.length) return "";
    var p = arr[0];
    for (var i = 1; i < arr.length; i++) {
      while (arr[i].indexOf(p) !== 0) {
        p = p.slice(0, -1);
        if (!p) return "";
      }
    }
    return p;
  }
  // Rank: title-prefix > title word-start > title substring > summary/tags.
  function search(q) {
    q = q.trim().toLowerCase();
    if (q.length < 2) return [];
    var scored = [];
    posts.forEach(function (p) {
      var title = p.title.toLowerCase();
      var blob = (p.title + " " + (p.summary || "") + " " + (p.tags || []).join(" ")).toLowerCase();
      var score = -1;
      if (title.indexOf(q) === 0) score = 0;
      else if (title.indexOf(" " + q) !== -1) score = 1;
      else if (title.indexOf(q) !== -1) score = 2;
      else if (blob.indexOf(q) !== -1) score = 3;
      if (score >= 0) scored.push({ p: p, score: score });
    });
    scored.sort(function (a, b) { return a.score - b.score; });
    return scored.map(function (s) { return s.p; });
  }
  function highlight(text, q) {
    var i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) +
      "</mark>" + esc(text.slice(i + q.length));
  }
  function findPost(arg) {
    arg = (arg || "").trim().replace(/^posts\//, "").replace(/\/$/, "");
    if (!arg) return null;
    var lower = arg.toLowerCase();
    return (
      posts.find(function (p) { return p.slug === arg; }) ||
      posts.find(function (p) { return p.slug.indexOf(arg) === 0; }) ||
      posts.find(function (p) { return p.title.toLowerCase().indexOf(lower) !== -1; })
    );
  }

  // ======================================================================
  // Header command terminal
  // ======================================================================
  (function initTerminal() {
    var input = document.getElementById("term-input");
    if (!input) return;
    var typed = document.getElementById("term-typed");
    var hint = document.getElementById("term-hint");
    var ghost = document.getElementById("term-ghost");
    var output = document.getElementById("term-output");
    var field = document.getElementById("term-field");
    var promptText =
      (document.querySelector("#term-live .term-prompt") || {}).textContent || "$";

    var history = [];
    var hpos = -1;

    function print(html, cls) {
      var div = document.createElement("div");
      div.className = "term-out-line" + (cls ? " " + cls : "");
      div.innerHTML = html;
      output.appendChild(div);
    }
    function sync() {
      typed.textContent = input.value;
      if (hint) hint.style.display = input.value ? "none" : "";
    }

    // The remaining characters Tab would add right now (fish-style ghost text).
    function bestCompletion() {
      var c = completionsFor(input.value);
      if (!c.list.length) return "";
      var cand;
      if (c.list.length === 1) {
        cand = c.list[0];
      } else {
        var prefix = lcp(c.list);
        if (prefix.length <= c.token.length) return ""; // Tab would only list
        cand = prefix;
      }
      return cand.slice(c.token.length);
    }
    function refresh() {
      sync();
      if (ghost) ghost.textContent = input.value ? bestCompletion() : "";
    }

    var commands = {
      help: function () {
        print("<span class='muted'>press <b>/</b> or the <b>⌕ search</b> button to search posts</span>");
        print("commands:");
        print("&nbsp;&nbsp;<b>ls</b>            list posts");
        print("&nbsp;&nbsp;<b>cd</b> &lt;post&gt;     open a post (slug or title)");
        print("&nbsp;&nbsp;<b>about</b>         about / whoami");
        print("&nbsp;&nbsp;<b>resume</b>        open my resume (pdf)");
        print("&nbsp;&nbsp;<b>rss</b>           the feed");
        print("&nbsp;&nbsp;<b>clear</b>         clear the screen");
        print("<span class='muted'>tab completes · ↑/↓ history</span>");
      },
      ls: function () {
        if (!posts.length) return print("no posts yet.");
        posts.forEach(function (p) {
          print(
            "<span class='ls-date'>" + p.date + "</span>  " +
              "<a href='/posts/" + p.slug + "/'>" + esc(p.title) + "</a>"
          );
        });
      },
      cd: function (args) {
        var a = args.join(" ").trim();
        if (a === "" || a === "~" || a === "/" || a === "..") return go("/");
        if (a === "about") return go("/about/");
        var p = findPost(a);
        if (p) return go("/posts/" + p.slug + "/");
        print("cd: no such post: " + esc(a), "err");
      },
      about: function () { go("/about/"); },
      resume: function () {
        print("opening resume.pdf …");
        window.open(resumeUrl, "_blank", "noopener");
      },
      whoami: function () { print(author); },
      rss: function () { go("/feed.xml"); },
      feed: function () { go("/feed.xml"); },
      home: function () { go("/"); },
      clear: function () { output.innerHTML = ""; },
    };
    commands.open = commands.cd;
    commands.cat = commands.cd;
    commands["?"] = commands.help;
    // hidden easter egg — the classic. catches any `sudo …`, incl. `sudo rm -r /`.
    commands.sudo = function () {
      print("nice try 😏 — this is a read-only static site.", "err");
    };

    function run(raw) {
      var lineStr = raw.trim();
      print("<span class='muted'>" + esc(promptText) + "</span> " + esc(raw), "echo");
      if (lineStr === "") return;
      var parts = lineStr.split(/\s+/);
      var cmd = parts.shift().toLowerCase();
      var fn = commands[cmd];
      if (fn) fn(parts);
      else print(esc(cmd) + ": command not found (try 'help')", "err");
      output.scrollTop = output.scrollHeight;
    }

    // ---- Tab autocomplete (commands + post titles) ----
    var COMMAND_NAMES = ["help", "ls", "cd", "about", "resume", "rss", "clear", "whoami", "home"];
    var ARG_COMMANDS = { cd: 1, open: 1, cat: 1 };

    function completionsFor(value) {
      var parts = value.trim() === "" ? [] : value.trim().split(/\s+/);
      var completingCommand = parts.length <= 1 && !/\s$/.test(value);
      if (completingCommand) {
        var token = (value.match(/[^\s]*$/) || [""])[0];
        return {
          mode: "command",
          leading: value.slice(0, value.length - token.length),
          token: token,
          list: COMMAND_NAMES.filter(function (c) { return c.indexOf(token) === 0; }),
        };
      }
      var cmd = (parts[0] || "").toLowerCase();
      if (!ARG_COMMANDS[cmd]) return { mode: "arg", leading: value, token: "", list: [] };
      var m = value.match(/^(\s*\S+\s+)([\s\S]*)$/);
      var leading = m ? m[1] : value;
      var arg = m ? m[2] : "";
      var lower = arg.toLowerCase();
      var byTitle = posts
        .filter(function (p) { return p.title.toLowerCase().indexOf(lower) === 0; })
        .map(function (p) { return p.title; });
      var list = byTitle.length
        ? byTitle
        : posts
            .filter(function (p) { return p.slug.indexOf(lower) === 0; })
            .map(function (p) { return p.slug; });
      return { mode: "arg", leading: leading, token: arg, list: list };
    }

    function complete() {
      var c = completionsFor(input.value);
      if (!c.list.length) return;
      if (c.list.length === 1) {
        input.value = c.leading + c.list[0] + (c.mode === "command" ? " " : "");
        sync();
        return;
      }
      var prefix = lcp(c.list);
      if (prefix.length > c.token.length) {
        input.value = c.leading + prefix;
        sync();
        return;
      }
      print("<span class='muted'>" + esc(promptText) + "</span> " + esc(input.value), "echo");
      if (c.mode === "command") print(c.list.map(esc).join("&nbsp;&nbsp;"));
      else c.list.forEach(function (t) { print(esc(t)); });
      output.scrollTop = output.scrollHeight;
    }

    input.addEventListener("input", refresh);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Tab") { e.preventDefault(); complete(); refresh(); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        var raw = input.value;
        if (raw.trim()) { history.unshift(raw); if (history.length > 50) history.pop(); }
        hpos = -1;
        run(raw);
        input.value = "";
        refresh();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (hpos < history.length - 1) { hpos++; input.value = history[hpos]; refresh(); }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (hpos > 0) { hpos--; input.value = history[hpos]; }
        else { hpos = -1; input.value = ""; }
        refresh();
        return;
      }
    });
    field.addEventListener("click", function () { input.focus(); });
    refresh();

    // Desktop only — don't force the on-screen keyboard open on touch devices.
    var finePointer =
      !window.matchMedia || window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (finePointer) {
      // Focus the prompt on load so visitors can type right away.
      input.focus({ preventScroll: true });

      // Clicking anywhere that isn't interactive returns focus to the prompt.
      document.addEventListener("click", function (e) {
        var modal = document.getElementById("search-modal");
        if (modal && !modal.hidden) return; // search modal owns focus while open
        var t = e.target;
        // leave links, buttons and form controls alone
        if (t && t.closest &&
            t.closest("a, button, input, textarea, select, label, summary, [contenteditable]")) {
          return;
        }
        // don't steal focus mid text-selection (copying)
        var sel = window.getSelection && window.getSelection();
        if (sel && String(sel).length) return;
        input.focus({ preventScroll: true });
      });
    }
  })();

  // ======================================================================
  // Search modal (command palette)
  // ======================================================================
  (function initSearch() {
    var modal = document.getElementById("search-modal");
    if (!modal) return;
    var openBtn = document.getElementById("open-search");
    var input = document.getElementById("m-input");
    var typed = document.getElementById("m-typed");
    var hint = document.getElementById("m-hint");
    var resultsEl = document.getElementById("m-results");

    var current = [];
    var selected = -1;

    function sync() {
      typed.textContent = input.value;
      if (hint) hint.style.display = input.value ? "none" : "";
    }

    function render(list, q) {
      current = list;
      resultsEl.innerHTML = "";
      if (!list.length) {
        var empty = document.createElement("li");
        empty.className = "r-empty";
        empty.textContent = q ? "no posts match “" + q + "”" : "no posts yet";
        resultsEl.appendChild(empty);
        selected = -1;
        return;
      }
      list.forEach(function (p, idx) {
        var li = document.createElement("li");
        li.setAttribute("role", "option");
        if (idx === selected) li.className = "sel";
        li.innerHTML =
          "<span class='ls-date'>" + p.date + "</span>" +
          "<span class='r-title'>" + highlight(p.title, q) + "</span>";
        li.addEventListener("mousedown", function (e) {
          e.preventDefault();
          go("/posts/" + p.slug + "/");
        });
        resultsEl.appendChild(li);
      });
    }

    function update() {
      var items = resultsEl.children;
      for (var i = 0; i < items.length; i++) {
        items[i].className = i === selected ? "sel" : "";
      }
      if (selected >= 0 && items[selected] && items[selected].scrollIntoView) {
        items[selected].scrollIntoView({ block: "nearest" });
      }
    }

    function refresh() {
      sync();
      var v = input.value.trim();
      var list = v.length < 2 ? posts.slice() : search(v); // empty/1-char -> browse all
      selected = list.length ? 0 : -1;
      render(list, v.length < 2 ? "" : v);
    }

    function autocomplete() {
      var q = input.value.trim();
      if (!q) return;
      var lower = q.toLowerCase();
      var byTitle = posts
        .filter(function (p) { return p.title.toLowerCase().indexOf(lower) === 0; })
        .map(function (p) { return p.title; });
      var list = byTitle.length
        ? byTitle
        : posts
            .filter(function (p) { return p.slug.indexOf(lower) === 0; })
            .map(function (p) { return p.slug; });
      if (!list.length) return;
      if (list.length === 1) input.value = list[0];
      else {
        var prefix = lcp(list);
        if (prefix.length > q.length) input.value = prefix;
      }
      refresh();
    }

    function open() {
      if (!modal.hidden) return;
      modal.hidden = false;
      document.body.classList.add("modal-open");
      input.value = "";
      refresh();
      setTimeout(function () { input.focus({ preventScroll: true }); }, 0);
    }
    function close() {
      modal.hidden = true;
      document.body.classList.remove("modal-open");
    }

    input.addEventListener("input", refresh);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key === "Tab") { e.preventDefault(); autocomplete(); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        if (current.length) go("/posts/" + current[selected >= 0 ? selected : 0].slug + "/");
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (current.length) { selected = Math.min(selected + 1, current.length - 1); update(); }
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (current.length) { selected = Math.max(selected - 1, 0); update(); }
        return;
      }
    });

    if (openBtn) openBtn.addEventListener("click", open);
    modal.addEventListener("click", function (e) {
      if (e.target && e.target.hasAttribute("data-close")) close();
    });

    function isTyping(e) {
      var t = e.target;
      var tag = (t && t.tagName) || "";
      return tag === "INPUT" || tag === "TEXTAREA" || (t && t.isContentEditable);
    }
    document.addEventListener("keydown", function (e) {
      if (!modal.hidden) return;
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        open();
      } else if (e.key === "/" && !isTyping(e)) {
        e.preventDefault();
        open();
      }
    });
  })();
})();
