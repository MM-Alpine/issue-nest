/** Shared control styling, kept out of Field.tsx so that file only exports components. */
export const controlClass = (hasError = false): string =>
  `w-full rounded-md border bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition-[border-color,box-shadow,background-color] placeholder:text-slate-400 hover:border-slate-400 disabled:bg-slate-50 disabled:text-slate-500 disabled:shadow-none ${
    hasError ? 'border-red-500' : 'border-slate-300 focus:border-indigo-500'
  }`;

export const inputClass = (hasError = false): string => `${controlClass(hasError)} h-9`;
