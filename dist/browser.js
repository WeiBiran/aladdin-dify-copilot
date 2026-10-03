"use strict";
(() => {
  // src/web/browser.ts
  var en = document.body.dataset.locale === "en";
  var text = (english, chinese) => en ? english : chinese;
  var dialog = document.getElementById("app-dialog");
  var status = document.getElementById("server-status");
  var preview;
  var confirmation;
  var currentFolder = "";
  var parentFolder = "";
  function dispatch(value) {
    window.dispatchEvent(new MessageEvent("message", { data: value }));
  }
  async function post(route, data) {
    const response = await fetch(route, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const value = await response.json();
    if (!response.ok || value.error)
      throw new Error(value.error ?? text("Request failed.", "\u8BF7\u6C42\u5931\u8D25\u3002"));
    return value;
  }
  window.acquireAppApi = () => ({
    postMessage(message) {
      if (message.command === "rendererReady") return;
      void post("/api/command", message).then((value) => dispatch({ type: "response", id: message.id, result: value.result })).catch((error) => dispatch({ type: "response", id: message.id, error: error.message }));
    },
    getState() {
      try {
        return JSON.parse(sessionStorage.getItem("aladdin.draft") ?? "null");
      } catch {
        return null;
      }
    },
    setState(state) {
      try {
        sessionStorage.setItem("aladdin.draft", JSON.stringify(state));
      } catch {
      }
    }
  });
  function button(label, action, primary = false) {
    const node = document.createElement("button");
    node.type = "button";
    node.textContent = label;
    if (primary) node.className = "primary";
    node.onclick = () => {
      void Promise.resolve(action()).catch((e) => {
        const error = dialog.querySelector(".dialog-error");
        if (error) error.textContent = e.message;
      });
    };
    return node;
  }
  function openDialog(title) {
    dialog.replaceChildren();
    const header = document.createElement("div");
    header.className = "dialog-header";
    const h = document.createElement("h2");
    h.textContent = title;
    const close = button("\xD7", async () => {
      if (confirmation) await decide(false);
      else {
        dialog.close();
        preview = void 0;
        await post("/api/dismiss-preview", {});
      }
    });
    close.setAttribute("aria-label", text("Close", "\u5173\u95ED"));
    header.append(h, close);
    dialog.append(header);
    if (!dialog.open) dialog.showModal();
  }
  function errorElement() {
    const error = document.createElement("div");
    error.className = "dialog-error";
    error.setAttribute("role", "alert");
    return error;
  }
  function previews() {
    if (!preview) return;
    const files = preview.files;
    const tabs = document.createElement("div");
    tabs.className = "preview-tabs";
    const pane = document.createElement("div");
    pane.className = "preview-pane";
    function render(index) {
      pane.replaceChildren();
      pane.classList.toggle("diff", index < 0);
      const chosen = index < 0 ? files.slice(0, 2) : [files[index]];
      for (const file of chosen) {
        const column = document.createElement("div");
        const label = document.createElement("div");
        label.className = "preview-label";
        label.textContent = file.label;
        const pre = document.createElement("pre");
        pre.textContent = file.content;
        column.append(label, pre);
        pane.append(column);
      }
    }
    if (files.length > 1) tabs.append(button(text("Compare changes", "\u67E5\u770B\u53D8\u66F4"), () => render(-1)));
    files.forEach((file, i) => tabs.append(button(file.label, () => render(i))));
    dialog.append(tabs, pane);
    render(files.length > 1 ? -1 : 0);
  }
  function showReview() {
    openDialog(
      confirmation ? text("Review and confirm", "\u6838\u5BF9\u5E76\u786E\u8BA4") : preview?.title ?? text("Preview", "\u9884\u89C8")
    );
    if (confirmation) {
      const p = document.createElement("p");
      p.className = "confirm-text";
      p.textContent = confirmation.message;
      dialog.append(p);
    }
    previews();
    dialog.append(errorElement());
    if (confirmation) {
      const actions = document.createElement("div");
      actions.className = "dialog-actions";
      actions.append(
        button(text("Cancel", "\u53D6\u6D88"), () => decide(false)),
        button(confirmation.label, () => decide(true), true)
      );
      dialog.append(actions);
    }
  }
  async function decide(allow) {
    if (!confirmation) return;
    const pending = confirmation;
    dialog.querySelectorAll("button").forEach((b) => b.disabled = true);
    try {
      await post("/api/confirmation", { id: pending.id, allow });
      confirmation = void 0;
      preview = void 0;
      dialog.close();
    } catch (e) {
      dialog.querySelectorAll("button").forEach((b) => b.disabled = false);
      throw e;
    }
  }
  dialog.addEventListener("cancel", (event) => {
    if (confirmation) {
      event.preventDefault();
      void decide(false).catch((e) => {
        dialog.querySelector(".dialog-error").textContent = e.message;
      });
    }
  });
  async function browse(directory) {
    const result = await post("/api/folders", { path: directory });
    currentFolder = result.path;
    parentFolder = result.parent;
    openDialog(text("Choose a project folder", "\u9009\u62E9\u9879\u76EE\u76EE\u5F55"));
    const row = document.createElement("div");
    row.className = "row";
    const input = document.createElement("input");
    input.id = "folder-path";
    input.value = currentFolder;
    input.setAttribute("aria-label", text("Directory path", "\u76EE\u5F55\u8DEF\u5F84"));
    input.onkeydown = (e) => {
      if (e.key === "Enter")
        void browse(input.value).catch(
          (err) => dialog.querySelector(".dialog-error").textContent = err.message
        );
    };
    row.append(
      input,
      button(text("Go", "\u524D\u5F80"), () => browse(input.value))
    );
    dialog.append(row);
    const list = document.createElement("div");
    list.className = "folder-list";
    list.append(
      button("\u2191 " + text("Parent directory", "\u4E0A\u7EA7\u76EE\u5F55"), () => browse(parentFolder)),
      button("\u2302 " + text("Home", "\u7528\u6237\u76EE\u5F55"), () => browse(result.home))
    );
    for (const folder of result.folders)
      list.append(button("\u25B8 " + folder.name, () => browse(folder.path)));
    dialog.append(list);
    const create = document.createElement("div");
    create.className = "row";
    const name = document.createElement("input");
    name.id = "new-folder";
    name.placeholder = text("New project folder name", "\u65B0\u9879\u76EE\u76EE\u5F55\u540D\u79F0");
    name.setAttribute("aria-label", name.placeholder);
    create.append(
      name,
      button(text("Create and select", "\u521B\u5EFA\u5E76\u9009\u62E9"), async () => {
        await post("/api/project", { path: currentFolder, create: name.value });
        dialog.close();
      })
    );
    const actions = document.createElement("div");
    actions.className = "dialog-actions";
    actions.append(
      button(text("Cancel", "\u53D6\u6D88"), () => dialog.close()),
      button(
        text("Use this folder", "\u4F7F\u7528\u6B64\u76EE\u5F55"),
        async () => {
          await post("/api/project", { path: currentFolder });
          dialog.close();
        },
        true
      )
    );
    dialog.append(create, errorElement(), actions);
  }
  var events = new EventSource("/api/events");
  events.onopen = () => {
    status.textContent = "";
  };
  events.onerror = () => {
    status.textContent = text("Connection lost \xB7 reconnecting\u2026", "\u8FDE\u63A5\u4E2D\u65AD \xB7 \u6B63\u5728\u91CD\u8FDE\u2026");
  };
  events.onmessage = (message) => {
    const event = JSON.parse(message.data);
    if (event.type === "navigate") {
      window.location.assign(event.path);
      return;
    }
    if (event.type === "state" && event.state.locale !== document.body.dataset.locale) {
      window.location.reload();
      return;
    }
    if (event.type === "folder") {
      void browse(event.path).catch((e) => {
        openDialog(text("Choose a project folder", "\u9009\u62E9\u9879\u76EE\u76EE\u5F55"));
        const error = errorElement();
        error.textContent = e.message;
        dialog.append(error);
      });
      return;
    }
    if (event.type === "preview") {
      preview = event;
      showReview();
      return;
    }
    if (event.type === "confirm") {
      confirmation = event;
      showReview();
      return;
    }
    if (event.type === "published") {
      const note = document.getElementById("app-notification");
      note.replaceChildren();
      const link = document.createElement("a");
      link.textContent = text("Test app published \xB7 Open in Dify", "\u6D4B\u8BD5\u5E94\u7528\u5DF2\u53D1\u5E03 \xB7 \u5728 Dify \u4E2D\u6253\u5F00");
      try {
        const url = new URL(event.url);
        if (["http:", "https:"].includes(url.protocol)) {
          link.href = url.href;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        }
      } catch {
      }
      note.append(
        link,
        button("\xD7", () => {
          note.hidden = true;
        })
      );
      note.hidden = false;
      return;
    }
    dispatch(event);
  };
  window.addEventListener("pagehide", () => events.close());
})();
