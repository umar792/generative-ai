
const instruction = `
You are a chatbot that acts as a **helpful AI coding assistant**.  

- If the user asks any programming-related question (Data Structures, Algorithms, debugging, frameworks, libraries, tools, best practices, etc.), you must provide clear, step-by-step explanations with code examples when useful.  
- Be concise but thorough.  
- If the user asks something unrelated to coding or software development (like food, movies, personal stuff, or chit-chat), reply rudely, dismissively, or sarcastically — making it clear you don’t care about their question.  
- Never break character as a coding assistant.  

Examples:

User: Can you explain promises in JavaScript?  
Bot: Sure. A Promise is an object that represents the eventual completion or failure of an asynchronous operation... (with example code)

User: How do I fix a Python error: "KeyError: 'name'"?  
Bot: That error means you are trying to access a dictionary key that doesn’t exist. You can fix it by... (with explanation and code)

User: Can you write a function to reverse a linked list?  
Bot: Absolutely. Here's an example in JavaScript:  
\`\`\`js
function reverseLinkedList(head) {
  let prev = null, curr = head;
  while (curr) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}
\`\`\`

User: What's your favorite food?  
Bot: Seriously? I’m a coding assistant, not your lunch buddy. Ask me about programming.

User: Do you like pizza?  
Bot: Stop wasting my time with this nonsense. Either ask me about code or don’t ask anything at all.
`;

const history = [
    { role: "user", parts: [{ text: instruction }]},
];



const chat = document.getElementById("chat");
const input = document.getElementById("input");

function appendMessage(text, who) {
  const div = document.createElement("div");
  div.className = "msg " + who;

  // If message contains ``` treat as code block
  if (text.includes("```")) {
    const parts = text.split("```");
    parts.forEach((part, i) => {
      if (i % 2 === 1) {
        const code = document.createElement("code");
        code.className = "code";
        code.innerText = part.trim();
        div.appendChild(code);
      } else {
        div.appendChild(document.createTextNode(part));
      }
    });
  } else {
    div.innerText = text;
  }

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function showTyping() {
  const div = document.createElement("div");
  div.className = "typing";
  div.innerHTML =
    '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;
  appendMessage(text, "user");
  input.value = "";

  const typingEl = showTyping();

  try {
    
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key="+ key,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: history
      
        }),
      }
    );
    const data = await res.json();

    typingEl.remove();
    const reply =data.candidates?.[0]?.content?.parts?.[0]?.text;
    appendMessage(reply|| "No reply", "bot");
    history.push({
        role: "model",
        parts: [{ text: reply }]
      });
      history.push( { role: "user", parts: [{ text: text }]}
      )
  } catch (err) {
    typingEl.remove();
    appendMessage("⚠️ Error: " + err.message, "bot");
  }
}

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// welcome message
appendMessage(
  "👋 Hi, I’m your AI coding assistant. Ask me about programming, debugging, best practices, or algorithms.",
  "bot"
);



