import React, { useState } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import "./App.css";

function App() {
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [bestAnswer, setBestAnswer] = useState(null);
  const [ocrText, setOcrText] = useState("");

  const onDrop = acceptedFiles => {
    setImage(acceptedFiles[0]);
    setOcrText("");
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] } });

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api/ask";
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setResults([]);
    setBestAnswer(null);
    const formData = new FormData();
    if (image) {
      formData.append("image", image);
    } else {
      formData.append("question", question);
    }
    try {
      const res = await axios.post(API_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResults(res.data.results);
      setBestAnswer(res.data.bestAnswer);
      if (res.data.question && image) setOcrText(res.data.question);
    } catch (err) {
      alert("Error: " + (err.response?.data?.error || err.message));
    }
    setLoading(false);
  };

  // Model icons (SVG or emoji)
  const modelIcons = {
    DeepSeek: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" alt="DeepSeek" className="w-8 h-8" />,
    Kimi: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" alt="Kimi" className="w-8 h-8" />,
    Qwen: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/swift/swift-original.svg" alt="Qwen" className="w-8 h-8" />,
    Gemma: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg" alt="Gemma" className="w-8 h-8" />
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center">
      {/* Models info in center top */}
      <div className="w-full max-w-2xl mx-auto pt-8 pb-2">
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="text-3xl font-black text-blue-400 mb-2 tracking-tight">Consensus AI</div>
          <div className="flex gap-6 mb-2">
            <div className="flex flex-col items-center">
              <span className="text-2xl">🧠</span>
              <span className="text-xs text-gray-300">DeepSeek</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl">🤖</span>
              <span className="text-xs text-gray-300">Kimi</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl">🐉</span>
              <span className="text-xs text-gray-300">Qwen</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl">💎</span>
              <span className="text-xs text-gray-300">Gemma</span>
            </div>
          </div>
          <div className="text-sm text-gray-400 text-center">Tired of sending multiple requests to various AI models?<br /><span className="font-bold text-blue-400">Try out Consensus AI!</span></div>
        </div>
      </div>
      {/* Main chat area */}
      <main className="flex-1 w-full max-w-2xl mx-auto flex flex-col items-center justify-between">
        <div className="w-full flex flex-col flex-1 px-4 pt-2 pb-32">
          {/* Chat bubbles for results */}
          {results.length > 0 && (
            <div className="flex flex-col gap-4 mb-4">
              {results.map((r, i) => (
                r.model !== "Consensus AI" ? (
                  <div key={r.model} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}> 
                    <div className={`rounded-2xl px-5 py-4 shadow-lg ${bestAnswer?.model === r.model ? 'bg-blue-900 border border-blue-400 text-white' : 'bg-gray-800 border border-gray-700 text-gray-100'} max-w-lg w-fit`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{['🧠','🤖','🐉','💎'][i]}</span>
                        <span className="font-bold text-blue-300">{r.model}</span>
                        {typeof r.probability === 'number' && (
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${r.probability > 80 ? 'bg-green-500 text-white' : r.probability > 50 ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'}`}>{r.probability}%</span>
                        )}
                      </div>
                      <div className="whitespace-pre-line break-words text-lg font-semibold">{r.answer}</div>
                    </div>
                  </div>
                ) : null
              ))}
              {/* Consensus AI answer bubble */}
              {results[results.length-1]?.model === "Consensus AI" && (
                <div className="flex justify-center">
                  <div className="rounded-2xl px-5 py-4 shadow-lg bg-gradient-to-r from-blue-700 via-blue-500 to-blue-700 text-white border border-blue-400 max-w-lg w-fit text-center font-bold text-lg">
                    <span className="text-2xl mr-2">🧩</span>Consensus AI: <span className="block mt-2 font-normal text-base">{results[results.length-1].answer}</span>
                  </div>
                </div>
              )}
              {bestAnswer && (
                <div className="flex justify-center">
                  <div className="mt-2 px-4 py-2 bg-blue-700 text-white rounded-2xl font-bold shadow-lg text-lg">Best Answer: {bestAnswer.answer}</div>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Chat input at bottom */}
        <form onSubmit={handleSubmit} className="fixed bottom-0 left-0 w-full flex justify-center bg-gray-900 border-t border-gray-800 py-6 px-2" style={{zIndex:10}}>
          <div className="flex flex-col w-full max-w-2xl gap-3">
            <input
              type="text"
              className="border border-gray-700 rounded-2xl px-5 py-4 text-base focus:outline-blue-400 bg-gray-800 text-white placeholder-gray-400"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              disabled={!!image}
              placeholder="Type your question..."
            />
            <div {...getRootProps()} className="border border-dashed border-gray-700 rounded-2xl px-5 py-4 bg-gray-800 cursor-pointer text-white">
              <input {...getInputProps()} />
              {image ? (
                <span className="font-semibold text-blue-300">Image selected: {image.name}</span>
              ) : (
                <span className="text-gray-400">Drag & drop an image here, or click to select</span>
              )}
            </div>
            {ocrText && (
              <div className="text-sm text-green-400">OCR Extracted: {ocrText}</div>
            )}
            <button
              type="submit"
              className="w-full bg-blue-700 text-white py-4 rounded-2xl font-bold hover:bg-blue-800 transition-colors shadow-lg"
              disabled={loading || (!question && !image)}
            >
              {loading ? "Processing..." : "Ask"}
            </button>
          </div>
        </form>
      </main>
      <footer className="text-center text-xs text-gray-500 mt-8 mb-2">
        Hackathon Project &copy; 2025
      </footer>
    </div>
  );
}

export default App;
