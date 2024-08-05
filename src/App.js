import { useEffect, useRef, useState } from "react";
import "./App.css";
import logo from "./images/logo.png";
import logo1 from "./images/logo1.png";
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

function SettingsRow(props) {
  return (
    <div className="settings-row">
      {props.name}
      :
      <input
        className="settings"
        type="text"
        value={props.value}
        onChange={(e) => props.setValue(e.target.value)}
      />
    </div>
  );
}

function Settings(props) {
  const rows = props.settings.map((s) => {
    return <SettingsRow name={s.name} value={s.value} setValue={s.setter} />;
  });
  return rows;
}

function Prompt(props) {
  const models = [
    {
      name: "Llama2 70b",
      path: "/models/llama-2-70b-chat-hf",
    },
    { name: "Llama2 7b", path: "/models/llama-2-7b-chat-hf" },
    {
      name: "Mixtral 8x7B",
      path: "/models/mistral_ai/Mixtral-8x7B-v0.1/snapshots/985aa055896a8f943d4a9f2572e6ea1341823841",
    },
    { name: "Llama3 70B", path: "/models/Meta-Llama-3-70B" },
  ];
  const [model, setModel] = useState(models[0].path);
  const [url, setUrl] = useState("http://localhost:8000/v1/chat/completions");
  const [showSettings, setShowSettings] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [temperature, setTemperature] = useState(0);
  const [topP, setTopP] = useState(0.95);

  const settings = [
    { name: "Url", value: url, setter: setUrl },
    { name: "Temperature", value: temperature, setter: setTemperature },
    { name: "Top P", value: topP, setter: setTopP },
  ];

  function sendPrompt(e) {
    e.preventDefault();

    const newMessage = { role: "user", content: prompt };
    setPrompt("");
    props.appendMessage(newMessage);
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [...props.messages, newMessage],
        max_tokens: 2048,
        model: model,
        temperature: temperature,
        top_p: topP,
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
      <form method="post" onSubmit={sendPrompt} autocomplete="off">
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
      {showSettings ? (
        <div className="settings">
          <div className="settings-row">
            <ModelsSelect models={models} setModel={setModel} />
          </div>
          <Settings settings={settings} />
        </div>
      ) : null}
      <a
        href="#"
        className="settings-toggle"
        onClick={(e) => {
          e.preventDefault();
          setShowSettings(!showSettings);
        }}
      >
        show/hide settings
      </a>
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
