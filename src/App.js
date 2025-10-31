import React, { useState } from 'react';
import './App.css';

function App() {
  const [inputText, setInputText] = useState('');
  const [parsedData, setParsedData] = useState(null);

  const parseInput = (text) => {
    const lines = text.split('\n').map(line => line.trim());
    
    // Extract order name
    const orderNameMatch = text.match(/Order Name:\s*(.+)/i);
    const orderName = orderNameMatch ? orderNameMatch[1].trim() : '';
    
    // Find all groups (categories like "Drawer Front - Slab:", "Drawer Front:", "Door:")
    const groups = [];
    let currentGroup = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this is a group header (ends with colon and is a known category)
      if (line.match(/^(Drawer Front|Door)(\s+-\s+Slab)?:/i)) {
        // Save previous group if it exists
        if (currentGroup && currentGroup.items.length > 0) {
          groups.push(currentGroup);
        }
        
        // Start new group
        currentGroup = {
          category: line.replace(':', '').trim(),
          metadata: {},
          items: []
        };
        continue;
      }
      
      // If we're in a group, collect metadata
      if (currentGroup) {
        // Check if we've hit the table header
        if (line.includes('ID') && line.includes('Qty') && line.includes('Width')) {
          // Skip the header line and start reading items
          i++; // Skip header
          
          while (i < lines.length) {
            const itemLine = lines[i];
            
            // Check if we hit the next group or end of items
            if (itemLine.match(/^(Drawer Front|Door)(\s+-\s+Slab)?:/i) || 
                itemLine.match(/^Total Items/i) ||
                itemLine.match(/^(Signature|Order Totals|Payment History|Notes)/i)) {
              i--; // Back up one line to reprocess
              break;
            }
            
            // Skip empty lines
            if (!itemLine) {
              i++;
              continue;
            }
            
            // Parse item line - format: ID	Qty	Width	Height	Cab # no commas		Price	Total
            // Or with additional info like "Hinge Drilling: Pair"
            const parts = itemLine.split('\t').filter(p => p.trim());
            
            if (parts.length >= 5) {
              const id = parts[0].trim();
              const qty = parts[1].trim();
              const width = parts[2].trim();
              const height = parts[3].trim();
              const cabNo = parts[4].trim();
              
              // Check for additional info on next line (like "Hinge Drilling: Pair")
              let additionalInfo = '';
              if (i + 1 < lines.length) {
                const nextLine = lines[i + 1].trim();
                if (nextLine.includes('Hinge Drilling:')) {
                  additionalInfo = nextLine;
                  i++; // Skip this line
                }
              }
              
              currentGroup.items.push({
                id,
                qty,
                width,
                height,
                cabNo,
                additionalInfo
              });
            }
            
            i++;
          }
          
          // Save the group
          if (currentGroup.items.length > 0) {
            groups.push(currentGroup);
            currentGroup = null;
          }
          continue;
        }
        
        // Collect metadata (key on one line, value on next line)
        // Format: "Wood Type:\nOak" or "Cabinet Door Hinge Drilling:\n4" on center"
        if (line.endsWith(':') && i + 1 < lines.length) {
          const key = line.replace(':', '').trim();
          const nextLine = lines[i + 1].trim();
          // Check if next line is a value (not a table header, not a new group, not tab-separated data)
          if (nextLine && 
              !nextLine.includes('\t') && 
              !nextLine.match(/^(Drawer Front|Door)(\s+-\s+Slab)?:/i) &&
              !nextLine.match(/^ID\s+Qty/i) &&
              !nextLine.match(/^Total Items/i)) {
            currentGroup.metadata[key] = nextLine;
            i++; // Skip the value line
            continue;
          }
        }
      }
    }
    
    // Save last group if it exists
    if (currentGroup && currentGroup.items.length > 0) {
      groups.push(currentGroup);
    }
    
    return { orderName, groups };
  };

  const handleParse = () => {
    const parsed = parseInput(inputText);
    setParsedData(parsed);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:py-4 print:px-0">
      <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-lg p-6 print:shadow-none print:rounded-none">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Door & Drawer Parser</h1>
        
        <div className="mb-6 print:hidden">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paste your order text here:
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full h-64 p-4 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Paste the order text here..."
          />
          <div className="mt-4 flex gap-4">
            <button
              onClick={handleParse}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Parse
            </button>
            {parsedData && (
              <button
                onClick={handlePrint}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Print
              </button>
            )}
          </div>
        </div>

        {parsedData && (
          <div className="print:block">
            {parsedData.orderName && (
              <div className="mb-6 pb-4 border-b-2 border-gray-300">
                <h2 className="text-2xl font-bold text-gray-800">Order: {parsedData.orderName}</h2>
              </div>
            )}
            
            {parsedData.groups.map((group, groupIndex) => (
              <div key={groupIndex} className="mb-8 page-break-inside-avoid">
                <div className="mb-4 bg-gray-100 p-4 rounded-md print:bg-gray-50">
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">{group.category}</h3>
                  
                  {Object.keys(group.metadata).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {Object.entries(group.metadata).map(([key, value]) => (
                        <div key={key} className="flex">
                          <span className="font-medium text-gray-700">{key}:</span>
                          <span className="ml-2 text-gray-600">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-gray-200 print:bg-gray-100">
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold">ID</th>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold">QTY</th>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Width</th>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Height</th>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Cab # no commas</th>
                        <th className="border border-gray-300 px-3 py-2 text-center font-semibold w-12 print:w-16">✓</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item, itemIndex) => (
                        <tr key={itemIndex} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2">{item.id}</td>
                          <td className="border border-gray-300 px-3 py-2">{item.qty}</td>
                          <td className="border border-gray-300 px-3 py-2">{item.width}</td>
                          <td className="border border-gray-300 px-3 py-2">{item.height}</td>
                          <td className="border border-gray-300 px-3 py-2">{item.cabNo}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 print:w-5 print:h-5"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            
            {/* Summary Section */}
            {parsedData.groups.length > 0 && (() => {
              // Calculate total quantity
              const totalQty = parsedData.groups.reduce((sum, group) => {
                return sum + group.items.reduce((groupSum, item) => {
                  return groupSum + parseInt(item.qty) || 0;
                }, 0);
              }, 0);
              
              // Collect all cab # values
              const allCabNos = parsedData.groups.flatMap(group => 
                group.items.map(item => item.cabNo)
              );
              // Get unique cab # values
              const uniqueCabNos = [...new Set(allCabNos)];
              
              // Custom sort function to organize cab # values
              // CO prefixed items first (CO1, CO2, etc.), then C0 prefixed items (C04, C05, etc.)
              const sortedCabNos = uniqueCabNos.sort((a, b) => {
                const aUpper = a.toUpperCase();
                const bUpper = b.toUpperCase();
                
                // Check if starts with CO (letter O) vs C0 (number zero)
                // CO items: second character is letter 'O'
                // C0 items: second character is number '0'
                const aIsCO = aUpper.length >= 2 && aUpper[1] === 'O';
                const bIsCO = bUpper.length >= 2 && bUpper[1] === 'O';
                
                // CO prefixed items come first
                if (aIsCO && !bIsCO) return -1;
                if (!aIsCO && bIsCO) return 1;
                
                // Within same group, sort alphabetically (case-insensitive)
                return aUpper.localeCompare(bUpper);
              });
              
              return (
                <div className="mt-8 pt-6 border-t-2 border-gray-300 page-break-inside-avoid">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Summary</h2>
                  
                  <div className="mb-6">
                    <div className="bg-gray-100 p-4 rounded-md print:bg-gray-50">
                      <p className="text-lg font-semibold text-gray-800">
                        Total Quantity: <span className="font-bold">{totalQty}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">cabinet doors and drawers included:</h3>
                    <div className="bg-gray-100 p-4 rounded-md print:bg-gray-50">
                      <div className="flex flex-wrap gap-2">
                        {sortedCabNos.map((cabNo, index) => (
                          <span 
                            key={index}
                            className="inline-block px-3 py-1 bg-white border border-gray-300 rounded text-sm font-mono"
                          >
                            {cabNo}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
      
      <style>{`
        @media print {
          @page {
            margin: 1.5cm;
            size: letter;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:block { display: block !important; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-gray-50 { background-color: #f9fafb !important; }
          .print\\:bg-gray-100 { background-color: #f3f4f6 !important; }
          .page-break-inside-avoid {
            page-break-inside: avoid;
          }
          table {
            border-collapse: collapse;
          }
          input[type="checkbox"] {
            -webkit-appearance: checkbox;
            appearance: checkbox;
            width: 16px;
            height: 16px;
          }
        }
      `}</style>
    </div>
  );
}

export default App;