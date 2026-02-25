import React, { useMemo, useState } from "react";

type Props = {
  valueUrl?: string;
  onFileSelected: (file: File) => void;
  label?: string;
  helperText?: string;
};

export default function ImageDropzone({ valueUrl, onFileSelected, label, helperText }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const preview = useMemo(() => valueUrl || "", [valueUrl]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div>
      {label && <div className="text-xs font-bold text-stone-500 uppercase mb-2">{label}</div>}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={[
          "rounded-2xl border-2 border-dashed p-4 transition",
          dragOver ? "border-emerald-500 bg-emerald-50" : "border-stone-200 bg-stone-50",
        ].join(" ")}
      >
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-white border border-stone-200 overflow-hidden flex items-center justify-center">
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-stone-400 text-xs font-bold">No image</span>
            )}
          </div>

          <div className="flex-1">
            <div className="font-black">Drag & drop an image here</div>
            <div className="text-sm text-stone-500 mt-1">or click to select a file</div>
            {helperText && <div className="text-xs text-stone-400 mt-1">{helperText}</div>}

            <label className="inline-flex mt-3 px-4 py-2 rounded-xl bg-stone-900 text-white font-black cursor-pointer">
              Choose file
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFileSelected(file);
                }}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
