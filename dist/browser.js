"use strict";
(() => {
  // src/web/workbench.ts
  function setupWorkbench(post2) {
    const en2 = document.body.dataset.locale === "en";
    const t = (enText, zh) => en2 ? enText : zh;
    const el = (id) => document.getElementById(id);
    const settings = el("settings-dialog");
    const workbench2 = el("workbench");
    let state;
    let selected = "editor";
    let frameKey = "";
    let projectPath = "";
    let publication = "";
    let draftRevision = "";
    let changing = false;
    const command = async (command2, payload) => (await post2("/api/command", { command: command2, payload })).result;
    function notice(message) {
      const target = el("global-message") ?? el("settings-message");
      if (target) {
        target.textContent = message;
        target.classList.add("error");
      }
    }
    function openSettings() {
      if (settings && !settings.open) settings.showModal();
      else if (!settings) window.location.assign("/settings");
    }
    function closeSettings() {
      settings?.close();
    }
    el("close-settings")?.addEventListener("click", closeSettings);
    el("toggle-projects")?.addEventListener(
      "click",
      () => workbench2?.classList.toggle("show-projects")
    );
    el("toggle-preview")?.addEventListener(
      "click",
      () => workbench2?.classList.toggle("show-preview")
    );
    function renderProjects() {
      if (!workbench2 || !state) return;
      const query = el("project-search").value.toLocaleLowerCase();
      const projects = state.projects ?? [];
      const list = el("project-list");
      list.replaceChildren();
      el("project-count").textContent = String(projects.length);
      for (const project of projects.filter((p) => p.name.toLocaleLowerCase().includes(query))) {
        const button2 = document.createElement("button");
        button2.type = "button";
        button2.className = "project-item" + (project.path === state.workspace?.path ? " active" : "");
        button2.setAttribute(
          "aria-current",
          project.path === state.workspace?.path ? "page" : "false"
        );
        button2.disabled = state.busy || changing || Boolean(project.missing);
        button2.title = project.path;
        const glyph = document.createElement("span");
        glyph.className = "project-glyph";
        glyph.textContent = project.mode === "advanced-chat" ? "\u25CC" : "\u25C7";
        const info = document.createElement("span");
        info.className = "project-info";
        const name = document.createElement("strong");
        name.textContent = project.name;
        const detail = document.createElement("small");
        detail.textContent = project.missing ? t("Folder unavailable", "\u76EE\u5F55\u4E0D\u53EF\u7528") : project.mode === "advanced-chat" ? "Chatflow" : project.mode === "workflow" ? "Workflow" : t("Local project", "\u672C\u5730\u9879\u76EE");
        info.append(name, detail);
        button2.append(glyph, info);
        button2.onclick = async () => {
          if (changing) return;
          changing = true;
          renderProjects();
          try {
            await post2("/api/project", { path: project.path });
            workbench2.classList.remove("show-projects");
          } catch (error) {
            notice(error.message);
          } finally {
            changing = false;
            renderProjects();
          }
        };
        list.append(button2);
      }
      el("create-project").disabled = state.busy || changing;
      workbench2.querySelectorAll("[data-command=selectFolder]").forEach((b) => b.disabled = state.busy || changing);
    }
    el("project-search")?.addEventListener("input", renderProjects);
    el("create-project")?.addEventListener("click", () => {
      const dialog2 = el("app-dialog");
      dialog2.replaceChildren();
      const h = document.createElement("h2");
      h.textContent = t("Create an agent project", "\u521B\u5EFA\u667A\u80FD\u4F53\u9879\u76EE");
      const form = document.createElement("form");
      form.className = "new-project-form";
      const field = (label, child) => {
        const node = document.createElement("label");
        node.className = "field";
        node.append(label, child);
        return node;
      };
      const name = document.createElement("input");
      name.required = true;
      name.maxLength = 100;
      name.placeholder = t("e.g. Customer support assistant", "\u4F8B\u5982\uFF1A\u5BA2\u6237\u670D\u52A1\u52A9\u624B");
      name.autocomplete = "off";
      const mode = document.createElement("select");
      for (const [value, label] of [
        ["advanced-chat", "Chatflow"],
        ["workflow", "Workflow"]
      ]) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        mode.append(option);
      }
      const help = document.createElement("p");
      help.textContent = t(
        "Each project owns its conversation, workflow and tests. Its Dify test app is created when the agent imports a draft.",
        "\u6BCF\u4E2A\u9879\u76EE\u4FDD\u5B58\u72EC\u7ACB\u7684\u5BF9\u8BDD\u3001\u5DE5\u4F5C\u6D41\u548C\u6D4B\u8BD5\u3002Agent \u5BFC\u5165\u8349\u7A3F\u65F6\u4F1A\u521B\u5EFA\u5BF9\u5E94\u7684 Dify \u6D4B\u8BD5\u5E94\u7528\u3002"
      );
      const error = document.createElement("p");
      error.className = "dialog-error";
      error.setAttribute("role", "alert");
      const actions = document.createElement("div");
      actions.className = "dialog-actions";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = t("Cancel", "\u53D6\u6D88");
      cancel.onclick = () => dialog2.close();
      const create = document.createElement("button");
      create.type = "submit";
      create.className = "primary";
      create.textContent = t("Create and start chatting", "\u521B\u5EFA\u5E76\u5F00\u59CB\u5BF9\u8BDD");
      actions.append(cancel, create);
      form.append(
        field(t("Agent name", "\u667A\u80FD\u4F53\u540D\u79F0"), name),
        field(t("App type", "\u5E94\u7528\u7C7B\u578B"), mode),
        help,
        error,
        actions
      );
      form.onsubmit = (e) => {
        e.preventDefault();
        create.disabled = cancel.disabled = true;
        void post2("/api/projects/create", { name: name.value, mode: mode.value }).then(() => {
          dialog2.close();
          workbench2.classList.remove("show-projects", "show-preview");
          el("chat-input").focus();
        }).catch((e2) => error.textContent = e2.message).finally(() => create.disabled = cancel.disabled = false);
      };
      dialog2.append(h, form);
      dialog2.showModal();
      name.focus();
    });
    const model = el("top-model-select");
    model?.addEventListener("change", () => {
      if (!state?.model || model.value === "__settings") {
        openSettings();
        model.value = state?.model?.model ?? "__settings";
        return;
      }
      const profile = state.model;
      model.disabled = true;
      void command("saveModel", {
        provider: profile.provider,
        baseUrl: profile.baseUrl,
        model: model.value,
        apiKey: ""
      }).catch((e) => notice(e.message)).finally(() => model.disabled = Boolean(state?.busy));
    });
    function renderGlobal() {
      if (!state) return;
      const connection = el("top-dify-address");
      if (connection) {
        connection.textContent = state.connection ? new URL(state.connection.baseUrl).host : t("Connect Dify", "\u8FDE\u63A5 Dify");
        connection.title = state.connection?.baseUrl ?? "";
        el("connection-led").classList.toggle("ready", Boolean(state.connection));
      }
      model.replaceChildren();
      for (const id of state.generationModels) {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = id;
        model.append(option);
      }
      const config = document.createElement("option");
      config.value = "__settings";
      config.textContent = state.model ? t("Configure models\u2026", "\u914D\u7F6E\u6A21\u578B\u2026") : t("Choose a generation model\u2026", "\u9009\u62E9\u751F\u6210\u6A21\u578B\u2026");
      model.append(config);
      model.value = state.model?.model ?? "__settings";
      model.disabled = state.busy;
    }
    function setExternal(value) {
      const link = el("external-preview");
      if (!link) return;
      link.hidden = true;
      link.removeAttribute("href");
      if (value) {
        try {
          const url = new URL(value);
          if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) {
            link.href = url.href;
            link.hidden = false;
          }
        } catch {
        }
      }
    }
    function renderPreview(refresh = false) {
      if (!workbench2 || !state) return;
      el("preview-project-name").textContent = state.task?.name ?? state.workspace?.name ?? t("Agent preview", "\u667A\u80FD\u4F53\u9884\u89C8");
      el("preview-app-type").textContent = state.task?.mode === "advanced-chat" ? "Chatflow" : "Workflow";
      workbench2.querySelectorAll("[data-preview]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.preview === selected)));
      const frame = el("dify-preview");
      const empty = el("preview-empty");
      const artifacts = el("artifact-preview");
      const local = ["dsl", "report"].includes(selected);
      if (local) setExternal();
      frame.hidden = local || !state.remoteApp;
      artifacts.hidden = !local;
      empty.hidden = local || Boolean(state.remoteApp);
      el("preview-setup").hidden = Boolean(state.connection && state.model?.hasKey);
      el("preview-address").textContent = state.remoteApp ? new URL(state.remoteApp.editorUrl).host + " / " + state.remoteApp.id : t("Waiting for a test app", "\u7B49\u5F85\u521B\u5EFA\u6D4B\u8BD5\u5E94\u7528");
      const phase = state.run?.phase;
      el("preview-phase").textContent = {
        complete: t("Published \xB7 tests passed", "\u5DF2\u53D1\u5E03 \xB7 \u6D4B\u8BD5\u901A\u8FC7"),
        failed: t("Task failed", "\u4EFB\u52A1\u5931\u8D25"),
        "needs-input": t("Needs attention", "\u9700\u8981\u5904\u7406"),
        cancelled: t("Stopped", "\u5DF2\u505C\u6B62")
      }[phase ?? ""] ?? (state.taskRunning ? t("Building\u2026", "\u6784\u5EFA\u4E2D\u2026") : t("Not started", "\u5C1A\u672A\u5F00\u59CB"));
      el("preview-capabilities").textContent = state.capabilities ? t(`${state.capabilities.tools} tools synced`, `\u5DF2\u540C\u6B65 ${state.capabilities.tools} \u4E2A\u5DE5\u5177`) : t("Tools are discovered from Dify", "\u80FD\u529B\u540C\u6B65\u540E\u81EA\u52A8\u9009\u7528\u5DE5\u5177");
      const key = state.remoteApp ? [
        projectPath,
        state.remoteApp.id,
        selected,
        publication,
        selected === "editor" ? draftRevision : ""
      ].join("|") : "";
      if (!state.remoteApp) {
        frame.removeAttribute("src");
        frameKey = "";
        setExternal();
      } else if (!local && (frameKey !== key || refresh)) {
        frameKey = key;
        const path = projectPath;
        const tab = selected;
        frame.src = "/preview?view=" + (selected === "runtime" ? "runtime" : "editor") + "&project=" + encodeURIComponent(projectPath) + "&revision=" + Date.now();
        setExternal(selected === "editor" ? state.remoteApp.editorUrl : void 0);
        void command("appPreview", { projectPath }).then((value) => {
          if (path === projectPath && tab === selected)
            setExternal(tab === "runtime" && value.published ? value.runtimeUrl : value.editorUrl);
        }).catch((e) => {
          if (path === projectPath) notice(e.message);
        });
      }
    }
    async function selectPreview(kind, refresh = false) {
      selected = kind;
      renderPreview(refresh);
      if (["dsl", "report"].includes(kind)) {
        el("artifact-title").textContent = kind === "dsl" ? "workflow.yml" : t("Test report", "\u6D4B\u8BD5\u62A5\u544A");
        el("artifact-content").textContent = t("Loading\u2026", "\u8BFB\u53D6\u4E2D\u2026");
        try {
          await command(kind === "dsl" ? "openDsl" : "openReport");
        } catch (e) {
          el("artifact-content").textContent = e.message.includes("ENOENT") ? kind === "dsl" ? t(
            "No DSL yet. Send your goal in chat to start building.",
            "\u5C1A\u672A\u751F\u6210 DSL\u3002\u53D1\u9001\u9700\u6C42\u540E\uFF0CAgent \u4F1A\u628A\u5DE5\u4F5C\u6D41\u4FDD\u5B58\u5230\u8FD9\u91CC\u3002"
          ) : t(
            "No test report yet. Results appear after the agent runs the test suite.",
            "\u5C1A\u672A\u8FD0\u884C\u6D4B\u8BD5\u3002Agent \u6267\u884C\u6D4B\u8BD5\u540E\uFF0C\u7ED3\u679C\u4F1A\u663E\u793A\u5728\u8FD9\u91CC\u3002"
          ) : e.message;
        }
      }
    }
    workbench2?.querySelectorAll("[data-preview]").forEach((b) => b.addEventListener("click", () => void selectPreview(b.dataset.preview)));
    el("refresh-preview")?.addEventListener("click", () => void selectPreview(selected, true));
    const divider = el("preview-divider");
    let dragging = false;
    let width = 46;
    function setWidth(value) {
      width = Math.min(64, Math.max(30, value));
      workbench2.style.setProperty("--preview-width", width + "%");
      divider.setAttribute("aria-valuenow", String(Math.round(width)));
    }
    divider?.addEventListener("pointerdown", (e) => {
      dragging = true;
      divider.setPointerCapture(e.pointerId);
    });
    divider?.addEventListener("pointermove", (e) => {
      if (dragging)
        setWidth(
          (workbench2.getBoundingClientRect().right - e.clientX) / workbench2.clientWidth * 100
        );
    });
    divider?.addEventListener("pointerup", () => {
      dragging = false;
    });
    divider?.addEventListener("lostpointercapture", () => {
      dragging = false;
    });
    divider?.addEventListener("keydown", (e) => {
      if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        setWidth(width + (e.key === "ArrowLeft" ? 2 : -2));
      }
    });
    return {
      openSettings,
      closeSettings,
      render(next) {
        state = next;
        renderGlobal();
        if (projectPath !== next.workspace?.path) {
          projectPath = next.workspace?.path ?? "";
          selected = next.remoteApp?.published ? "runtime" : "editor";
          publication = "";
          draftRevision = "";
          frameKey = "";
          if (workbench2) {
            el("artifact-title").textContent = "";
            el("artifact-content").textContent = "";
          }
        }
        const published = next.remoteApp?.published ? next.remoteApp.id + ":published" : "";
        if (published && publication !== published && selected === "editor") selected = "runtime";
        publication = published;
        if (next.run?.phase === "testing") draftRevision = next.run.id + ":" + next.run.round;
        renderProjects();
        renderPreview();
      },
      artifact(event) {
        if (!workbench2 || event.files.length !== 1) return false;
        if (event.projectPath && event.projectPath !== projectPath) return true;
        selected = event.files[0].label === "workflow.yml" ? "dsl" : "report";
        renderPreview();
        el("artifact-title").textContent = event.files[0].label;
        el("artifact-content").textContent = event.files[0].content;
        return true;
      }
    };
  }

  // src/web/browser.ts
  var en = document.body.dataset.locale === "en";
  var text = (english, chinese) => en ? english : chinese;
  var dialog = document.getElementById("app-dialog");
  var status = document.getElementById("server-status");
  var preview;
  var confirmation;
  var currentFolder = "";
  var parentFolder = "";
  var workbench = setupWorkbench(post);
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
    getState(projectPath) {
      try {
        if (projectPath) {
          const drafts = JSON.parse(sessionStorage.getItem("aladdin.drafts") ?? "{}");
          if (drafts[projectPath]) return drafts[projectPath];
        }
        return JSON.parse(sessionStorage.getItem("aladdin.draft") ?? "null");
      } catch {
        return null;
      }
    },
    setState(state) {
      try {
        sessionStorage.setItem("aladdin.draft", JSON.stringify(state));
        if (state.workspacePath) {
          const drafts = JSON.parse(sessionStorage.getItem("aladdin.drafts") ?? "{}");
          drafts[state.workspacePath] = state;
          sessionStorage.setItem("aladdin.drafts", JSON.stringify(drafts));
        }
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
      if (document.body.dataset.page === "task") {
        if (event.path === "/settings") workbench.openSettings();
        else workbench.closeSettings();
      } else window.location.assign(event.path);
      return;
    }
    if (event.type === "state" && event.state.locale !== document.body.dataset.locale) {
      window.location.reload();
      return;
    }
    if (event.type === "state") workbench.render(event.state);
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
      if (!confirmation && workbench.artifact(event)) return;
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
