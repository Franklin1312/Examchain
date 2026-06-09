"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Stage, Layer, Rect, Line, Image as KonvaImage } from "react-konva";
import { ChevronLeft, ChevronRight, Download, Pencil, Square, Trash2, AlertTriangle } from "lucide-react";
import { PROCESSED_BASE } from "@/lib/api";

interface Issue {
  _id: string;
  type: string;
  severity: string;
  pageNumber: number;
  details: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

interface Props {
  paperId: string;
  issues: Issue[];
  totalPages: number;
}

type DrawMode = "none" | "rect" | "pencil";

const ISSUE_COLORS: Record<string, string> = {
  unevaluated_page:  "rgba(220, 38, 38, 0.25)",
  blur_penalized:    "rgba(220, 38, 38, 0.25)",
  missing_page:      "rgba(220, 38, 38, 0.25)",
  anomalous_zero:    "rgba(234, 88, 12, 0.20)",
  arithmetic_error:  "rgba(234, 88, 12, 0.20)",
  repeat_stamp:      "rgba(234, 88, 12, 0.20)",
  supplement_missing:"rgba(220, 38, 38, 0.25)",
};

export default function AnswerSheetViewer({ paperId, issues, totalPages }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [drawMode, setDrawMode] = useState<DrawMode>("none");
  const [drawings, setDrawings] = useState<Record<number, any[]>>({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState<number[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [imgSize, setImgSize] = useState({ width: 800, height: 1100 });
  const [pageImage, setPageImage] = useState<HTMLImageElement | null>(null);
  const [imgLoading, setImgLoading] = useState(true);
  const stageRef = useRef<any>(null);

  const imageUrl   = `${PROCESSED_BASE}/processed/${paperId}/page_${String(currentPage).padStart(3, "0")}.png`;
  const pageIssues = issues.filter((i) => i.pageNumber === currentPage);

  // Load page image into a native Image element for Konva
  useEffect(() => {
    setImgLoading(true);
    setPageImage(null);
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
      setPageImage(img);
      setImgLoading(false);
    };
    img.onerror = () => setImgLoading(false);
  }, [imageUrl]);

  const pageDrawings = drawings[currentPage] || [];

  const handleMouseDown = useCallback((e: any) => {
    if (drawMode === "none") return;
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();

    if (drawMode === "pencil") {
      setCurrentLine([pos.x, pos.y]);
    } else if (drawMode === "rect") {
      const newRect = { type: "rect", x: pos.x, y: pos.y, width: 0, height: 0, id: Date.now() };
      setDrawings((d) => ({ ...d, [currentPage]: [...(d[currentPage] || []), newRect] }));
    }
  }, [drawMode, currentPage]);

  const handleMouseMove = useCallback((e: any) => {
    if (!isDrawing) return;
    const pos = e.target.getStage().getPointerPosition();

    if (drawMode === "pencil") {
      setCurrentLine((line) => [...line, pos.x, pos.y]);
    } else if (drawMode === "rect") {
      setDrawings((d) => {
        const pageDrawings = [...(d[currentPage] || [])];
        const last = pageDrawings[pageDrawings.length - 1];
        if (last?.type === "rect") {
          last.width  = pos.x - last.x;
          last.height = pos.y - last.y;
        }
        return { ...d, [currentPage]: pageDrawings };
      });
    }
  }, [isDrawing, drawMode, currentPage]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (drawMode === "pencil" && currentLine.length > 2) {
      setDrawings((d) => ({
        ...d,
        [currentPage]: [...(d[currentPage] || []), { type: "line", points: currentLine, id: Date.now() }]
      }));
      setCurrentLine([]);
    }
  }, [isDrawing, drawMode, currentLine, currentPage]);

  const clearDrawings = () => {
    setDrawings((d) => ({ ...d, [currentPage]: [] }));
  };

  const exportReport = async () => {
    if (!stageRef.current) return;
    const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 });
    const link    = document.createElement("a");
    link.download = `inkless-report-page${currentPage}.png`;
    link.href     = dataURL;
    link.click();
  };


  return (
    <div className="card overflow-hidden">
      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-ink-100 flex items-center gap-3 flex-wrap">
        <h2 className="font-display text-lg font-semibold text-navy-900 mr-2">
          Answer Sheet Viewer
        </h2>

        <div className="flex gap-1 bg-ink-100 p-1 rounded-lg">
          <button
            onClick={() => setDrawMode("none")}
            className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors
              ${drawMode === "none" ? "bg-white text-navy-800 shadow-sm" : "text-ink-500 hover:text-ink-700"}`}
          >
            Select
          </button>
          <button
            onClick={() => setDrawMode("rect")}
            className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors flex items-center gap-1
              ${drawMode === "rect" ? "bg-white text-navy-800 shadow-sm" : "text-ink-500 hover:text-ink-700"}`}
          >
            <Square className="w-3 h-3" /> Box
          </button>
          <button
            onClick={() => setDrawMode("pencil")}
            className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors flex items-center gap-1
              ${drawMode === "pencil" ? "bg-white text-navy-800 shadow-sm" : "text-ink-500 hover:text-ink-700"}`}
          >
            <Pencil className="w-3 h-3" /> Draw
          </button>
        </div>

        <button
          onClick={clearDrawings}
          className="flex items-center gap-1 text-xs text-ink-500 hover:text-red-600 cursor-pointer transition-colors px-2 py-1"
        >
          <Trash2 className="w-3 h-3" /> Clear
        </button>

        <button
          onClick={exportReport}
          className="flex items-center gap-1.5 btn-secondary text-xs px-4 py-2 ml-auto"
        >
          <Download className="w-3.5 h-3.5" /> Export page
        </button>
      </div>

      {/* Issues for this page */}
      {pageIssues.length > 0 && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-100 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-red-700 mb-1">
              {pageIssues.length} issue{pageIssues.length > 1 ? "s" : ""} detected on this page
            </p>
            {pageIssues.map((issue) => (
              <button
                key={issue._id}
                onClick={() => setSelectedIssue(selectedIssue?._id === issue._id ? null : issue)}
                className="text-xs text-red-600 underline cursor-pointer mr-3 font-body"
              >
                {issue.type.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Issue detail */}
      {selectedIssue && (
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
          <p className="text-xs text-amber-800 font-body">{selectedIssue.details}</p>
        </div>
      )}

      {/* Canvas viewer */}
      <div className="flex justify-center bg-ink-100 p-4 overflow-auto">
        {imgLoading ? (
          <div className="flex items-center justify-center w-full h-96 text-ink-400 text-sm">
            Loading page image...
          </div>
        ) : !pageImage ? (
          <div className="flex items-center justify-center w-full h-96 text-red-400 text-sm">
            Could not load page image.
          </div>
        ) : (
          <Stage
            ref={stageRef}
            width={imgSize.width}
            height={imgSize.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ cursor: drawMode !== "none" ? "crosshair" : "default" }}
          >
            {/* Layer 1: The actual answer sheet image */}
            <Layer>
              <KonvaImage
                image={pageImage}
                width={imgSize.width}
                height={imgSize.height}
              />
            </Layer>

            {/* Layer 2: Issue overlays */}
            <Layer>
              {pageIssues.map((issue) => (
                issue.boundingBox ? (
                  <Rect
                    key={issue._id}
                    x={issue.boundingBox.x}
                    y={issue.boundingBox.y}
                    width={issue.boundingBox.width}
                    height={issue.boundingBox.height}
                    fill={ISSUE_COLORS[issue.type] || "rgba(220,38,38,0.2)"}
                    stroke={issue.severity === "critical" ? "#DC2626" : "#EA580C"}
                    strokeWidth={2}
                    dash={[8, 4]}
                  />
                ) : (
                  <Rect
                    key={issue._id}
                    x={0} y={0}
                    width={imgSize.width}
                    height={imgSize.height}
                    fill={ISSUE_COLORS[issue.type] || "rgba(220,38,38,0.1)"}
                    stroke={issue.severity === "critical" ? "#DC2626" : "#EA580C"}
                    strokeWidth={3}
                    dash={[12, 6]}
                  />
                )
              ))}
            </Layer>

            {/* Layer 3: User drawings */}
            <Layer>
              {pageDrawings.map((drawing: any) => {
                if (drawing.type === "line") {
                  return (
                    <Line
                      key={drawing.id}
                      points={drawing.points}
                      stroke="#1E3A8A"
                      strokeWidth={3}
                      tension={0.5}
                      lineCap="round"
                      globalCompositeOperation="source-over"
                    />
                  );
                }
                if (drawing.type === "rect") {
                  return (
                    <Rect
                      key={drawing.id}
                      x={drawing.x} y={drawing.y}
                      width={drawing.width} height={drawing.height}
                      stroke="#1E3A8A"
                      strokeWidth={2}
                      fill="rgba(30, 58, 138, 0.1)"
                    />
                  );
                }
                return null;
              })}
              {isDrawing && drawMode === "pencil" && currentLine.length > 2 && (
                <Line
                  points={currentLine}
                  stroke="#1E3A8A"
                  strokeWidth={3}
                  tension={0.5}
                  lineCap="round"
                />
              )}
            </Layer>
          </Stage>
        )}
      </div>

      {/* Page navigation */}
      <div className="px-6 py-4 border-t border-ink-100 flex items-center justify-between">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="btn-secondary px-4 py-2 text-sm flex items-center gap-1 disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <span className="font-body text-sm text-ink-600">
          Page <span className="font-bold text-ink-900">{currentPage}</span>
          {" "}of {totalPages || "?"}
          {pageIssues.length > 0 && (
            <span className="ml-2 badge-critical">{pageIssues.length} issue{pageIssues.length > 1 ? "s" : ""}</span>
          )}
        </span>

        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages || 999, p + 1))}
          disabled={currentPage === totalPages}
          className="btn-secondary px-4 py-2 text-sm flex items-center gap-1 disabled:opacity-40"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
