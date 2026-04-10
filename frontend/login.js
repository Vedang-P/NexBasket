import { apiFetch, setActiveUser } from "./api.js";
import { showStatus } from "./ui.js";

const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginStatus.innerHTML = "";

  const payload = {
    email: document.getElementById("loginEmail").value.trim(),
    password: document.getElementById("loginPassword").value,
  };

  try {
    const result = await apiFetch("/users/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setActiveUser({
      user_id: result.user_id,
      name: result.name,
      email: result.email,
    });
    showStatus(loginStatus, "Login successful. Redirecting to products...", "success");
    setTimeout(() => {
      window.location.href = "products.html";
    }, 500);
  } catch (error) {
    showStatus(loginStatus, error.message, "error");
  }
});
