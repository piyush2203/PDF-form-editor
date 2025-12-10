

/* eslint-disable no-unused-vars */
import { useEffect, useRef, useState } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { Rnd } from "react-rnd";

// import "@react-pdf-viewer/core/lib/styles/index.css";
// import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import "@react-pdf-viewer/core/lib/styles/index.css";

const PDF_FILE = "/sample.pdf";

function App() {
  const [fields, setFields] = useState([]);
  const [pdfSize, setPdfSize] = useState({ width: 1, height: 1 });
  const pdfRef = useRef(null);

  const deleteField = (id) => {
    const updated = fields.filter((f) => f.id !== id);
    setFields(updated);
  };

  const finishAndDownload = async () => {
  const payload = {
    pdfUrl: PDF_FILE,
    fields: fields,
  };

  try {
    const res = await fetch("http://localhost:4000/generate-signed-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.success) {
      window.open(`http://localhost:4000${data.signedPdfUrl}`, "_blank");
    } else {
      alert("Something went wrong while generating the PDF.");
    }
  } catch (err) {
    alert("Error connecting to backend.");
    console.error(err);
  }
};


  useEffect(() => {
    const updateSize = () => {
      if (pdfRef.current) {
        setPdfSize({
          width: pdfRef.current.offsetWidth,
          height: pdfRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);

    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const collectFieldData = () => {
    const payload = {
      pdfUrl: PDF_FILE,
      fields: fields.map((f) => ({
        id: f.id,
        type: f.type,
        fieldName: f.fieldName || null,
        value: f.value || null,
        checked: f.checked || false,
        imageUrl: f.imageUrl || null,

        page: 1, // (multi-page support later)

        xRel: f.xRel,
        yRel: f.yRel,
        wRel: f.wRel,
        hRel: f.hRel,
      })),
    };

    console.log("FINAL PAYLOAD:", payload);
    alert("Check console for JSON output");
  };

  const addField = (type) => {
    let size = {};

    switch (type) {
      case "signature":
        size = { wRel: 45, hRel: 12 };
        break;
      case "text":
        size = { wRel: 200, hRel: 30 };
        break;
      case "date":
        size = { wRel: 100, hRel: 50 };
        break;
      case "radio":
        size = { wRel: 60, hRel: 40 };
        break;
      case "image":
        size = { wRel: 200, hRel: 150 };
        break;
      default:
        size = { wRel: 30, hRel: 10 };
    }

    setFields([
      ...fields,
      {
        id: Date.now(),
        type,
        xRel: 0.2,
        yRel: 0.2,
        ...size,
        value: "",
        checked: false,
        imageUrl: "",
      },
    ]);
  };

  return (
    <div
  className="min-h-screen flex flex-col text-white bg-cover bg-center bg-no-repeat"
  style={{ backgroundImage: "url('/background.jpg')" }}
>

      {/* Header */}
      <header className="p-6 border-b border-zinc-800 flex items-center justify-center shadow-lg">
        <h1 className="text-5xl font-semibold">
          BoloForms - PDF Form Builder
        </h1>
        
      </header>

      <div className="flex gap-3 p-4">
        <button
          onClick={() => addField("signature")}
          className="px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-700"
        >
          + Signature
        </button>

        <button
          onClick={() => addField("text")}
          className="px-4 py-2 bg-green-600 rounded text-white hover:bg-green-700"
        >
          + Text
        </button>

        <button
          onClick={() => addField("date")}
          className="px-4 py-2 bg-purple-600 rounded text-white hover:bg-purple-700"
        >
          + Date
        </button>

        <button
          onClick={() => addField("radio")}
          className="px-4 py-2 bg-orange-600 rounded text-white hover:bg-orange-700"
        >
          + Radio
        </button>

        <button
          onClick={() => addField("image")}
          className="px-4 py-2 bg-pink-600 rounded text-white hover:bg-pink-700"
        >
          + Image
        </button>
        <button
          onClick={collectFieldData}
          className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
        >
          Export Field Data (JSON)
        </button>
        <button
  onClick={finishAndDownload}
  className="px-5 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 shadow"
>
  Finish & Download PDF
</button>

      </div>

      
      <main className="flex flex-1 justify-center items-start py-10 px-4">
        
        <div
          id="pdf-container"
          className="relative border border-zinc-700 rounded-xl shadow-lg bg-zinc-800"
          style={{ width: "750px", height: "900px" }}
        >
          
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
            <Viewer
              fileUrl={PDF_FILE}
              defaultScale={1.2}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              theme="dark"
            />
          </Worker>

          {/* 🔥 Draggable Test Box */}
          {fields.map((f) => {
            const x = f.xRel * pdfSize.width;
            const y = f.yRel * pdfSize.height;
            const width = f.wRel * pdfSize.width;
            const height = f.hRel * pdfSize.height;

            return (
              <Rnd
                key={f.id}
                size={{ width, height }}
                position={{ x, y }}
                bounds="parent"
                style={{ zIndex: 9999 }}
                className="absolute bg-white bg-opacity-90 text-black shadow-lg rounded border border-zinc-700"
                onDragStop={(e, d) => {
                  const updated = fields.map((item) =>
                    item.id === f.id
                      ? {
                          ...item,
                          xRel: d.x / pdfSize.width,
                          yRel: d.y / pdfSize.height,
                        }
                      : item
                  );
                  setFields(updated);
                }}
                onResizeStop={(e, direction, ref, delta, pos) => {
                  const updated = fields.map((item) =>
                    item.id === f.id
                      ? {
                          ...item,
                          wRel: parseFloat(ref.style.width) / pdfSize.width,
                          hRel: parseFloat(ref.style.height) / pdfSize.height,
                          xRel: pos.x / pdfSize.width,
                          yRel: pos.y / pdfSize.height,
                        }
                      : item
                  );
                  setFields(updated);
                }}
              >
                {/* 🔥 Delete Button */}
                <button
                  onClick={() => deleteField(f.id)}
                  className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-lg hover:bg-red-700 z-[99999]"
                >
                  ✕
                </button>

                {/* Actual field content */}
                <div className="rnd-content w-full h-full p-1 flex items-center justify-center">
                  {/* Signature */}
                  {f.type === "signature" && (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <span>✒️ Signature</span>
                      <input
                        type="text"
                        placeholder="Signer Name"
                        value={f.fieldName}
                        className="mt-1 text-sm w-full bg-transparent border-b border-gray-700 text-center focus:outline-none"
                        onChange={(e) => {
                          const updated = fields.map((item) =>
                            item.id === f.id
                              ? { ...item, fieldName: e.target.value }
                              : item
                          );
                          setFields(updated);
                        }}
                      />
                    </div>
                  )}

                  {/* Text */}
                  {f.type === "text" && (
                    <input
                      type="text"
                      className="w-full h-full bg-white text-black px-2 outline-none"
                      value={f.value}
                      onChange={(e) => {
                        const updated = fields.map((item) =>
                          item.id === f.id
                            ? { ...item, value: e.target.value }
                            : item
                        );
                        setFields(updated);
                      }}
                    />
                  )}

                  {/* Date */}
                  {f.type === "date" && (
                    <input
                      type="date"
                      className="w-full h-full bg-white text-black px-2 outline-none"
                      value={f.value}
                      onChange={(e) => {
                        const updated = fields.map((item) =>
                          item.id === f.id
                            ? { ...item, value: e.target.value }
                            : item
                        );
                        setFields(updated);
                      }}
                    />
                  )}

                  {/* Radio */}
                  {f.type === "radio" && (
                    <div className="flex items-center gap-2 w-full h-full">
                      <input
                        type="radio"
                        checked={f.checked}
                        onChange={() => {
                          const updated = fields.map((item) =>
                            item.id === f.id
                              ? { ...item, checked: !f.checked }
                              : item
                          );
                          setFields(updated);
                        }}
                      />
                      <span>Option</span>
                    </div>
                  )}

                  {/* Image */}
                  {f.type === "image" &&
                    (f.imageUrl ? (
                      <img
                        src={f.imageUrl}
                        className="w-full h-full object-contain rounded"
                      />
                    ) : (
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full h-full bg-white text-black p-1"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const updated = fields.map((item) =>
                              item.id === f.id
                                ? { ...item, imageUrl: reader.result }
                                : item
                            );
                            setFields(updated);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    ))}
                </div>
              </Rnd>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default App;
