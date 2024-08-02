import { useEffect, useRef, useState } from "react";
import "./App.css";
import logo from "./images/logo.png";
import Markdown from "react-markdown";
import { flushSync } from "react-dom";

const AlwaysScrollToBottom = () => {
  const elementRef = useRef();
  useEffect(() => elementRef.current.scrollIntoView());
  return <div ref={elementRef} />;
};

function Content(props) {
  return (
    <div className={props.className}>
      <Markdown>{props.content}</Markdown>
    </div>
  );
}

function Message(props) {
  const role = props.message.role === "user" ? "User" : "Chat";
  const className = `bubble ${role}`;
  if (role === "User") {
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
        <img alt="ChatGPT@Home" src={logo} />
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

function ModelsSelect(props) {
  function changeModel(e) {
    props.setModel(e.target.value);
  }
  const options = props.models.map((m) => {
    return <option value={m.path}>{m.name}</option>;
  });
  return <select onChange={changeModel}>{options}</select>;
}

function Prompt(props) {
  const models = [
    {
      name: "Llama 70b",
      path: "/models/llama-2-70b-chat-hf",
    },
    { name: "Llama 7b", path: "/models/llama-2-7b-chat-hf" },
    {
      name: "Mixtral 8x7B",
      path: "/models/mistral_ai/Mixtral-8x7B-v0.1/snapshots/985aa055896a8f943d4a9f2572e6ea1341823841",
    },
  ];
  const [model, setModel] = useState(models[0].path);
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
        model: model,
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
        // Otherwise do something here to process current chunk
        // Read some more, and call this function again
        return reader.read().then(pump);
      });
    });
  }

  return (
    <div className="prompt">
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
      <ModelsSelect models={models} setModel={setModel} />
    </div>
  );
}

function App() {
  function appendMessage(message) {
    flushSync(() => {
      setMessages([...messagesRef.current, message]);
    });
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
    <>
      <div className="App">
        <div className="logo">
          <img src={logo} width={128} alt="Small logo" />
        </div>
        <ChatWindow messages={messages} />
      </div>
      <Prompt
        appendMessage={appendMessage}
        appendToLastMessage={appendToLastMessage}
        messages={messages}
      />
    </>
  );
}

export default App;
