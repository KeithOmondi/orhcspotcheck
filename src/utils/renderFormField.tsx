import { type ReactNode } from 'react';

interface FormField {
  id: string;
  label: string;
  type: 'yes_no' | 'text' | 'number' | 'date' | 'table' | 'matrix' | 'challenge_table';
  required?: boolean;
  dependsOn?: { field: string; value: unknown };
  subFields?: FormField[];
  columns?: string[];
  rows?: Record<string, unknown>[];
}

const renderCellValue = (value: unknown, defaultFallback = '—'): string => {
  if (value === null || value === undefined) return defaultFallback;
  if (typeof value === 'object') return defaultFallback;
  return String(value);
};

export const renderField = (field: FormField, index: number): ReactNode => {
  const isConditional = !!field.dependsOn;
  const conditionalInfo = isConditional
    ? ` (depends on "${field.dependsOn?.field}" = ${String(field.dependsOn?.value)})`
    : '';

  return (
    <div
      key={field.id || index}
      className={`border-l-4 pl-4 mb-4 ${isConditional ? 'border-yellow-300 bg-yellow-50/30' : 'border-transparent'}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              {field.type}
            </span>
            {field.required && (
              <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">required</span>
            )}
            {isConditional && (
              <span className="text-xs text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded">
                conditional{conditionalInfo}
              </span>
            )}
          </div>
          <div className="mt-1 text-gray-800 text-sm leading-relaxed">{field.label}</div>
        </div>
      </div>

      <div className="mt-2 ml-1">
        {field.type === 'yes_no' && (
          <div className="flex gap-4 text-xs text-gray-500">
            <span>◉ Yes</span>
            <span>◉ No</span>
          </div>
        )}

        {field.type === 'text' && (
          <div className="mt-1 text-xs text-gray-400 italic">[Text input]</div>
        )}

        {field.type === 'number' && (
          <div className="mt-1 text-xs text-gray-400 italic">[Number input]</div>
        )}

        {field.type === 'date' && (
          <div className="mt-1 text-xs text-gray-400 italic">[Date picker]</div>
        )}

        {field.type === 'table' && field.columns && (
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-xs border border-gray-200 rounded">
              <thead className="bg-gray-100">
                <tr>
                  {field.columns.map((col, i) => (
                    <th key={i} className="px-3 py-2 text-left font-medium text-gray-700 border-b">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(field.rows && field.rows.length > 0 ? field.rows : [{}]).map((row, ri) => (
                  <tr key={ri} className="border-t border-gray-100">
                    {field.columns!.map((col, ci) => {
                      const rawValue = row[col];
                      let displayValue = '—';
                      if (rawValue !== undefined && rawValue !== null) {
                        if (typeof rawValue === 'object') displayValue = '—';
                        else displayValue = String(rawValue);
                      }
                      if (ci === 0 && displayValue === '—' && ri === 0 && field.rows?.length === 0) {
                        displayValue = '';
                      }
                      return (
                        <td key={ci} className="px-3 py-2 text-gray-500">
                          {displayValue}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {field.type === 'matrix' && field.columns && field.rows && (
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-xs border border-gray-200 rounded">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-r">Row</th>
                  {field.columns.map((col, i) => (
                    <th key={i} className="px-3 py-2 text-left font-medium text-gray-700">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {field.rows.map((row, ri) => (
                  <tr key={ri} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono text-gray-600 border-r">
                      {renderCellValue(row.name ?? row.row ?? ri + 1)}
                    </td>
                    {field.columns!.map((_, ci) => (
                      <td key={ci} className="px-3 py-2 text-gray-400">—</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {field.type === 'challenge_table' && field.columns && (
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-xs border border-gray-200 rounded">
              <thead className="bg-gray-100">
                <tr>
                  {field.columns.map((col, i) => (
                    <th key={i} className="px-3 py-2 text-left font-medium text-gray-700">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {field.rows && field.rows.length > 0 ? (
                  field.rows.map((row, ri) => (
                    <tr key={ri} className="border-t border-gray-100">
                      {field.columns!.map((col, ci) => {
                        const rawValue = row[col] ?? row[Object.keys(row)[ci]];
                        return (
                          <td key={ci} className="px-3 py-2 text-gray-500">
                            {renderCellValue(rawValue)}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={field.columns.length} className="px-3 py-4 text-center text-gray-400">
                      No rows defined
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {field.subFields && field.subFields.length > 0 && (
        <div className="ml-6 mt-3 pl-3 border-l-2 border-gray-200">
          {field.subFields.map((sub, idx) => renderField(sub, idx))}
        </div>
      )}
    </div>
  );
};