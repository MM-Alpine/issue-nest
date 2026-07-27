/** Shared control styling, kept out of Field.tsx so that file only exports components. */
export const controlClass = (hasError = false): string =>
  `w-full rounded-md border bg-white px-3 text-sm text-slate-900 transition-colors placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500 ${
    hasError ? 'border-red-500' : 'border-slate-300'
  }`;

export const inputClass = (hasError = false): string => `${controlClass(hasError)} h-9`;
