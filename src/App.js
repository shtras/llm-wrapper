import { useEffect, useRef, useState } from "react";
import "./App.css";
import logo from "./images/logo.png";

const AlwaysScrollToBottom = () => {
  const elementRef = useRef();
  useEffect(() => elementRef.current.scrollIntoView());
  return <div ref={elementRef} />;
};

function Content(props) {
  return (
    <div className={props.className}>
      {props.content.split("\n").map((i) => {
        return (
          <>
            {i}
            <br />
          </>
        );
      })}
    </div>
  );
}

function Message(props) {
  const role = props.message.role === "user" ? "User" : "Chat";
  const className = `bubble ${role}`;
  if (role == "User") {
    return (
      <div className="message">
        <Content content={props.message.content} className={className} />
        <div className="role-name">{role}</div>
      </div>
    );
  } else {
    return (
      <div className="message">
        <div className="role-name">{role}</div>
        <Content content={props.message.content} className={className} />
      </div>
    );
  }
}

function ChatWindow(props) {
  if (props.messages.length === 0) {
    return (
      <div className="messages">
        <img src={logo} />
        <br />
        Welcome to ChatGPT@Home. Ask me anything
      </div>
    );
  }
  const messages = props.messages.map((m) => {
    return <Message message={m} />;
  });
  return (
    <div className="messages">
      {messages}
      <AlwaysScrollToBottom />
    </div>
  );
}

function Prompt(props) {
  const [prompt, setPrompt] = useState("");
  function sendPrompt(e) {
    e.preventDefault();

    const newMessage = { role: "user", content: prompt };
    setPrompt("");
    props.appendMessage(newMessage);
    fetch("http://localhost:8000/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [...props.messages, newMessage],
        max_tokens: 2048,
        model: "/models/llama-2-70b-chat-hf",
        stream: true,
      }),
    }).then((response) => {
      props.appendMessage({ role: "assistant", content: "" });
      const reader = response.body.getReader();
      // read() returns a promise that resolves when a value has been received
      reader.read().then(function pump({ done, value }) {
        if (done) {
          // Do something with last chunk of data then exit reader
          return;
        }

        // Create json from value
        const decoder = new TextDecoder();
        const chunk = decoder.decode(value);

        console.log(chunk);
        let tokens = "";
        chunk.split("data:").forEach((c) => {
          try {
            const json = JSON.parse(c);
            const deltaToken = json.choices[0].delta.content || "";
            if (typeof deltaToken === "string") {
              console.log(`AAA ${deltaToken}`);
              tokens += deltaToken;
            }
          } catch (e) {
            console.log(e.Message);
          }
        });
        console.log(`Tokens: ${tokens}`);
        props.appendToLastMessage(tokens);
        //const json = JSON.parse(chunk);

        // Otherwise do something here to process current chunk

        // Read some more, and call this function again
        return reader.read().then(pump);
      });
    });
  }

  return (
    <form method="post" onSubmit={sendPrompt}>
      <input
        className="prompt"
        name="promptText"
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button className="send" type="submit">
        ↑
      </button>
    </form>
  );
}

function App() {
  function appendMessage(message) {
    setMessages([...messagesRef.current, message]);
  }
  function appendToLastMessage(message) {
    setMessages([
      ...messagesRef.current.slice(0, -1),
      {
        ...messagesRef.current[messagesRef.current.length - 1],
        content:
          messagesRef.current[messagesRef.current.length - 1].content + message,
      },
    ]);
  }
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  return (
    <div className="App">
      <ChatWindow messages={messages} />
      <Prompt
        appendMessage={appendMessage}
        appendToLastMessage={appendToLastMessage}
        messages={messages}
      />
    </div>
  );
}

export default App;
