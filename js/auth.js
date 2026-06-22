// ============================================================
//  Auth — Deutsch Entries
//  Handles: login form, admin session guard, sign-out.
//  Safe before keys are set: login shows a friendly message,
//  and the admin page stays viewable as a static preview.
// ============================================================
(function () {
  var configured = !!window.SUPABASE_CONFIGURED;
  var db = window.db;

  // ---- which page are we on? ----
  var loginForm = document.querySelector(".login-form form");
  var isAdmin = !!document.querySelector(".admin");

  // ---------- LOGIN PAGE ----------
  if (loginForm) {
    // make room for an inline message under the button (reuses page styles)
    var msg = document.createElement("p");
    msg.className = "login-note";
    msg.style.color = "var(--rug)";
    msg.style.display = "none";
    msg.style.marginTop = "16px";
    loginForm.appendChild(msg);

    function showMsg(text) {
      msg.textContent = text;
      msg.style.display = "block";
    }

    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var email = (document.getElementById("email") || {}).value || "";
      var pw = (document.getElementById("pw") || {}).value || "";

      if (!configured) {
        showMsg("The backend isn’t connected yet. Add your Supabase keys to go live — then this form signs you in for real.");
        return;
      }
      if (!email || !pw) {
        showMsg("Please enter your email and password.");
        return;
      }

      var btn = loginForm.querySelector("button[type=submit]");
      var label = btn ? btn.innerHTML : "";
      if (btn) { btn.disabled = true; btn.innerHTML = "Signing in…"; }

      db.auth.signInWithPassword({ email: email, password: pw }).then(function (res) {
        if (res.error) {
          showMsg("That didn’t work: " + res.error.message);
          if (btn) { btn.disabled = false; btn.innerHTML = label; }
          return;
        }
        window.location.href = "admin.html";
      }).catch(function (err) {
        showMsg("Connection problem: " + (err && err.message ? err.message : err));
        if (btn) { btn.disabled = false; btn.innerHTML = label; }
      });
    });
  }

  // ---------- ADMIN PAGE: session guard + sign-out ----------
  if (isAdmin) {
    // Wire every "Sign out" link.
    document.querySelectorAll('a[href="login.html"]').forEach(function (a) {
      if ((a.textContent || "").toLowerCase().indexOf("sign out") !== -1) {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          if (configured && db) {
            db.auth.signOut().then(function () { window.location.href = "login.html"; });
          } else {
            window.location.href = "login.html";
          }
        });
      }
    });

    // Guard: if keys are set but nobody is logged in, bounce to login.
    // (Before keys are set we leave the admin viewable as a design preview.)
    if (configured && db) {
      db.auth.getSession().then(function (res) {
        var session = res && res.data ? res.data.session : null;
        if (!session) {
          window.location.replace("login.html");
        } else {
          window.__ADMIN_SESSION = session;
          document.dispatchEvent(new CustomEvent("admin-authed"));
        }
      });
    }
  }
})();
