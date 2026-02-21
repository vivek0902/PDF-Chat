"use client";
import * as React from "react";

const FileuploadComponent: React.FC = () => {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  const [file, setFile] = React.useState<File | null>(null);
  const [userId, setUserId] = React.useState("");
  const [question, setQuestion] = React.useState("");
  const [chatMessages, setChatMessages] = React.useState<
    { id: string; role: "user" | "assistant"; text: string; time: string }[]
  >([]);
  const [lastJobId, setLastJobId] = React.useState<string | number | null>(
    null,
  );
  const [uploadMessage, setUploadMessage] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [isAsking, setIsAsking] = React.useState(false);

  const getCurrentTime = () =>
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleUpload = async () => {
    if (!file) {
      setErrorMessage("Please choose a PDF first.");
      return;
    }

    setErrorMessage("");
    setUploadMessage("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("pdf", file);
      if (userId.trim()) {
        formData.append("userId", userId.trim());
      }

      const response = await fetch(`${apiBaseUrl}/upload/pdf`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to upload PDF.");
      }

      setLastJobId(data.jobId ?? null);
      setUploadMessage(
        "PDF queued successfully. Wait for worker completion, then ask questions.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Upload failed.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) {
      setErrorMessage("Please enter a question.");
      return;
    }

    const currentQuestion = question.trim();

    setErrorMessage("");
    setQuestion("");
    setIsAsking(true);

    setChatMessages((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        role: "user",
        text: currentQuestion,
        time: getCurrentTime(),
      },
    ]);

    try {
      const payload: { question: string; userId?: string } = {
        question: currentQuestion,
      };

      if (userId.trim()) {
        payload.userId = userId.trim();
      }

      const response = await fetch(`${apiBaseUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Chat failed.");
      }

      setChatMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: data?.answer || "No answer returned.",
          time: getCurrentTime(),
        },
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Chat failed.");
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="min-h-screen w-full p-6 md:p-10">
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
        <section className="rounded-xl border p-5 md:p-6">
          <h2 className="text-xl font-semibold">Upload PDF</h2>
          <p className="mt-1 text-sm opacity-80">
            Upload a PDF to create searchable vectors.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm">PDF File</label>
              <input
                type="file"
                accept=".pdf"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="w-full rounded-md border px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm">User ID (optional)</label>
              <input
                type="text"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                placeholder="example: user123"
                className="w-full rounded-md border px-3 py-2"
              />
            </div>

            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full rounded-md border px-4 py-2 font-medium disabled:opacity-60"
            >
              {isUploading ? "Uploading..." : "Upload PDF"}
            </button>
          </div>

          {uploadMessage ? (
            <p className="mt-4 text-sm">{uploadMessage}</p>
          ) : null}
          {lastJobId ? (
            <p className="mt-2 text-sm">Job ID: {String(lastJobId)}</p>
          ) : null}
        </section>

        <section className="rounded-xl border p-5 md:p-6">
          <h2 className="text-xl font-semibold">Chat with PDF</h2>
          <p className="mt-1 text-sm opacity-80">
            Ask questions after worker processing is complete.
          </p>

          <div className="mt-5 rounded-md border p-3 min-h-80 max-h-[28rem] overflow-y-auto">
            {chatMessages.length > 0 ? (
              <div className="space-y-3">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        message.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.text}</p>
                      <p
                        className={`mt-1 text-[11px] ${
                          message.role === "user"
                            ? "text-blue-100"
                            : "opacity-70"
                        }`}
                      >
                        {message.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm opacity-70">
                Chat messages will appear here.
              </p>
            )}
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm">Type your question</label>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="What is this document about?"
                rows={3}
                className="w-full rounded-md border px-3 py-2"
              />
            </div>

            <button
              type="button"
              onClick={handleAsk}
              disabled={isAsking}
              className="w-full rounded-md border px-4 py-2 font-medium disabled:opacity-60"
            >
              {isAsking ? "Getting answer..." : "Ask"}
            </button>
          </div>
        </section>
      </div>

      {errorMessage ? (
        <div className="mx-auto mt-6 max-w-6xl rounded-md border border-red-500 px-4 py-3 text-sm text-red-500">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
};

export default FileuploadComponent;
