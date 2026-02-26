document.querySelector('#app').innerHTML = `
  <div style="font-family: Arial; padding: 40px;">
    <h2>RAG Assistant</h2>
    <input id="message" placeholder="Ask something..." style="width: 300px; padding: 8px;" />
    <button id="send" style="padding: 8px;">Send</button>
    <p id="response" style="margin-top:20px; font-weight: bold;"></p>
  </div>
`;

document.getElementById("send").addEventListener("click", async () => {
  const message = document.getElementById("message").value;

  const res = await fetch("https://rag-assistant-backend-3qtn.onrender.com/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sessionId: "abc123",
      message: message
    })
  });

  const data = await res.json();

  document.getElementById("response").innerText = data.reply;
});