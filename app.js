const message = document.getElementById("message");
const btn = document.getElementById("btn");

message.textContent = "Loaded from S3 🎉";

btn.addEventListener("click", () => {
  const now = new Date().toISOString();
  alert(`Button clicked at: ${now}`);
});
