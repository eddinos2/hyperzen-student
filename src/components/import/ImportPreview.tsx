interface ImportPreviewProps {
  headers: string[];
  rows: Record<string, string>[];
  totalLines: number;
}

export const ImportPreview = ({ headers, rows, totalLines }: ImportPreviewProps) => {
  return (
    <div className="brutal-card overflow-hidden">
      <div className="bg-black text-white p-6">
        <h2 className="text-3xl font-black">PRÉVISUALISATION</h2>
        <p className="text-lg font-bold mt-2">
          {totalLines} lignes détectées - Affichage des 10 premières
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-primary">
            <tr>
              {headers.slice(0, 8).map((header, i) => (
                <th key={i} className="px-4 py-3 text-left font-black text-sm uppercase">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y-2 divide-black">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-yellow-50">
                {headers.slice(0, 8).map((header, j) => (
                  <td key={j} className="px-4 py-3 font-medium text-sm">
                    {row[header]?.substring(0, 30) || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
