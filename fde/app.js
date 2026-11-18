/* Shared behaviour for the FDE study site: day progress (this browser only) and an in-page Python runner. */
(function () {
  var PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
  var KEY = "fde-site-done";

  function getDone() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  function setDone(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }

  /* ---------- progress ---------- */
  function initProgress() {
    var done = getDone();
    document.querySelectorAll("input.daydone").forEach(function (box) {
      var id = box.getAttribute("data-id");
      box.checked = !!done[id];
      box.addEventListener("change", function () {
        var d = getDone();
        if (box.checked) d[id] = true; else delete d[id];
        setDone(d);
        updateCounts();
      });
    });
    updateCounts();
  }
  function updateCounts() {
    var done = getDone();
    var total = 0, n = 0;
    document.querySelectorAll("[data-week-count]").forEach(function (el) {
      var wk = el.getAttribute("data-week-count"), size = +el.getAttribute("data-size");
      var c = 0;
      for (var d = 1; d <= size; d++) if (done[wk + "-" + d]) c++;
      el.textContent = c + "/" + size;
      total += size; n += c;
    });
    var p = document.getElementById("prog");
    if (p && total && document.getElementById("filter")) p.textContent = n + " / " + total + " days";
    var next = document.getElementById("nextup");
    if (next && window.FDE_DAYS) {
      var hit = window.FDE_DAYS.find(function (x) { return !done[x.id]; });
      next.innerHTML = hit
        ? 'Next: <a href="week-' + hit.week + '.html#day-' + hit.day + '"><b>Week ' + hit.week + ", day " + hit.day + "</b></a> — " + esc(hit.topic)
        : "Every day is marked done.";
    }
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- filter on the index ---------- */
  function initFilter() {
    var box = document.getElementById("filter");
    if (!box) return;
    box.addEventListener("input", function () {
      var q = box.value.trim().toLowerCase();
      document.querySelectorAll(".weeks li").forEach(function (li) {
        li.hidden = q && li.getAttribute("data-text").indexOf(q) < 0;
      });
    });
  }

  /* ---------- Python runner (Pyodide, loaded on first Run) ---------- */
  var pyPromise = null;
  function getPy() {
    if (!pyPromise) {
      pyPromise = new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = PYODIDE + "pyodide.js";
        s.onload = function () { loadPyodide({ indexURL: PYODIDE }).then(resolve, reject); };
        s.onerror = function () { reject(new Error("The Python runtime could not be loaded from cdn.jsdelivr.net. It may be blocked on this network: use one of the online services on the Playground page instead.")); };
        document.head.appendChild(s);
      });
      pyPromise.catch(function () { pyPromise = null; });
    }
    return pyPromise;
  }
  function runCode(code, outEl, btn) {
    outEl.hidden = false; outEl.className = "out"; outEl.textContent = "Running… (the first run downloads the Python runtime)";
    btn.disabled = true;
    return getPy().then(function (py) {
      var lines = [];
      py.setStdout({ batched: function (l) { lines.push(l); } });
      py.setStderr({ batched: function (l) { lines.push(l); } });
      return py.loadPackagesFromImports(code).then(function () {
        return py.runPythonAsync(code);
      }).then(function () {
        outEl.textContent = lines.join("\n") || "(finished, nothing printed)";
      }).catch(function (e) {
        var msg = String(e && e.message || e).trim().split("\n").slice(-4).join("\n");
        if (/ModuleNotFoundError|No module named/.test(msg)) msg += "\n\nThis block needs a package or live service that is not available in the browser. Read it instead of running it.";
        outEl.className = "out err";
        outEl.textContent = (lines.length ? lines.join("\n") + "\n" : "") + msg;
      });
    }).catch(function (e) {
      outEl.className = "out err"; outEl.textContent = String(e.message || e);
    }).then(function () { btn.disabled = false; });
  }
  function initCode() {
    document.querySelectorAll(".code[data-run]").forEach(function (box) {
      var pre = box.querySelector("pre"), out = box.querySelector(".out"), run = box.querySelector(".run");
      run.addEventListener("click", function () { runCode(pre.textContent, out, run); });
    });
    var reset = document.getElementById("resetpy");
    if (reset) reset.addEventListener("click", function () { location.reload(); });
    var play = document.getElementById("playrun");
    if (play) play.addEventListener("click", function () {
      runCode(document.getElementById("playcode").value, document.getElementById("playout"), play);
    });
  }

  document.addEventListener("DOMContentLoaded", function () { initProgress(); initFilter(); initCode(); });
})();
