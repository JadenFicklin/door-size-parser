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
      if (line.match(/^(Drawer Front|Door|End Panel)(\s+-\s+Slab)?:/i)) {
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
        // Check if we've hit the table header (must have ID, Qty, and Width, and not be part of another structure)
        if (line.includes('ID') && (line.includes('Qty') || line.includes('QTY')) && line.includes('Width') && line.includes('\t')) {
          // Skip the header line and start reading items
          i++; // Skip header
          
          while (i < lines.length) {
            const itemLine = lines[i];
            
            // Check if we hit the next group or end of items
            if (itemLine.match(/^(Drawer Front|Door|End Panel)(\s+-\s+Slab)?:/i) || 
                itemLine.match(/^Total Items?$/i) ||
                itemLine.match(/^(Signature|Order Totals|Payment History|Notes|Powered By)/i)) {
              i--; // Back up one line to reprocess
              break;
            }
            
            // Skip empty lines
            if (!itemLine) {
              i++;
              continue;
            }
            
            // Skip if this looks like a header row
            if (itemLine.match(/^ID[\s\t]+Qty/i) || itemLine.match(/^ID[\s\t]+QTY/i)) {
              i++;
              continue;
            }
            
            // Parse item line - format: ID	Qty	Width	Height	Cab # no commas		Price	Total
            // Or with additional info like "Hinge Drilling: Pair" or "Panels Wide: 2"
            const parts = itemLine.split('\t').filter(p => p.trim());
            
            // Must have at least ID, Qty, Width, Height, Cab # (5 parts minimum)
            if (parts.length >= 5) {
              // Check if first part looks like an ID (format: "number number" or "number")
              const idPattern = /^\d+\s+\d+|^\d+/;
              if (!idPattern.test(parts[0])) {
                // Not a valid item row, might be additional info like "Panels Wide: 2"
                if (itemLine.includes(':')) {
                  // This is additional info, store it with the previous item if exists
                  if (currentGroup.items.length > 0) {
                    const lastItem = currentGroup.items[currentGroup.items.length - 1];
                    lastItem.additionalInfo = (lastItem.additionalInfo ? lastItem.additionalInfo + '; ' : '') + itemLine;
                  }
                }
                i++;
                continue;
              }
              const id = parts[0].trim();
              const qty = parts[1].trim();
              const width = parts[2].trim();
              const height = parts[3].trim();
              const cabNo = parts[4].trim();
              
              // Check for additional info on next line (like "Hinge Drilling: Pair" or "Panels Wide: 2")
              let additionalInfo = '';
              if (i + 1 < lines.length) {
                const nextLine = lines[i + 1].trim();
                // Check if next line is additional info (contains colon and no tabs)
                if (nextLine.includes(':') && !nextLine.includes('\t') && !nextLine.match(/^(Drawer Front|Door|End Panel)(\s+-\s+Slab)?:/i)) {
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
          
          // Skip if the key itself looks like a table header or total line
          if (key.match(/^(ID|Qty|QTY|Width|Height|Cab #|Price|Total)$/i)) {
            i++;
            continue;
          }
          
          const nextLine = lines[i + 1].trim();
          // Check if next line is a value (not a table header, not a new group, not tab-separated data)
          if (nextLine && 
              !nextLine.includes('\t') && 
              !nextLine.match(/^(Drawer Front|Door|End Panel)(\s+-\s+Slab)?:/i) &&
              !nextLine.match(/^ID[\s\t]+(Qty|QTY)/i) &&
              !nextLine.match(/^Total Items?$/i) &&
              !nextLine.match(/^\d+\s+Total Items?$/i)) {
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:py-1 print:px-0">
      <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-lg p-6 print:shadow-none print:rounded-none print:p-2">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 print:text-xl print:mb-2">Doors & Drawer Parser</h1>
        
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
              <div className="mb-3 pb-1 border-b border-gray-300 print:mb-2 print:pb-1">
                <h2 className="text-2xl font-bold text-gray-800 print:text-lg">
                  Order: <span className="bg-yellow-300 print:bg-yellow-300 px-2 py-1 rounded">{parsedData.orderName}</span>
                </h2>
              </div>
            )}
            
            {parsedData.groups.map((group, groupIndex) => (
              <div key={groupIndex} className="mb-4 page-break-inside-avoid print:mb-2">
                <div className="mb-2 bg-gray-100 p-2 rounded-md print:bg-gray-50 print:p-1">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2 print:text-sm print:mb-1">{group.category}</h3>
                  
                  {Object.keys(group.metadata).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-xs print:grid-cols-4">
                      {Object.entries(group.metadata).map(([key, value]) => (
                        <div key={key} className="flex">
                          <span className="font-medium text-gray-700 print:text-xs">{key}:</span>
                          <span className="ml-1 text-gray-600 print:text-xs">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-xs print:text-xs">
                    <thead>
                      <tr className="bg-gray-200 print:bg-gray-100">
                        <th className="border border-gray-300 px-1 py-1 text-left font-semibold print:px-1 print:py-0.5">ID</th>
                        <th className="border border-gray-300 px-1 py-1 text-left font-semibold print:px-1 print:py-0.5">QTY</th>
                        <th className="border border-gray-300 px-1 py-1 text-left font-semibold print:px-1 print:py-0.5">Width</th>
                        <th className="border border-gray-300 px-1 py-1 text-left font-semibold print:px-1 print:py-0.5">Height</th>
                        <th className="border border-gray-300 px-1 py-1 text-left font-semibold print:px-1 print:py-0.5">Cab # no commas</th>
                        <th className="border border-gray-300 px-1 py-1 text-center font-semibold w-8 print:w-8">✓</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item, itemIndex) => (
                        <tr key={itemIndex} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-1 py-1 print:px-1 print:py-0.5">{item.id}</td>
                          <td className="border border-gray-300 px-1 py-1 print:px-1 print:py-0.5">{item.qty}</td>
                          <td className="border border-gray-300 px-1 py-1 print:px-1 print:py-0.5">{item.width}</td>
                          <td className="border border-gray-300 px-1 py-1 print:px-1 print:py-0.5">{item.height}</td>
                          <td className="border border-gray-300 px-1 py-1 print:px-1 print:py-0.5">{item.cabNo}</td>
                          <td className="border border-gray-300 px-1 py-1 text-center print:px-1 print:py-0.5">
                            <input 
                              type="checkbox" 
                              className="w-3 h-3 print:w-3 print:h-3"
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
                <div className="mt-4 pt-2 border-t border-gray-300 page-break-inside-avoid print:mt-2 print:pt-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-3 print:text-lg print:mb-1">Summary</h2>
                  
                  <div className="mb-3 print:mb-1">
                    <div className="bg-gray-100 p-2 rounded-md print:bg-gray-50 print:p-1">
                      <p className="text-lg font-semibold text-gray-800 print:text-sm">
                        Total Quantity: <span className="font-bold">{totalQty}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2 print:text-sm print:mb-1">cabinet door and drawers included:</h3>
                    <div className="bg-gray-100 p-2 rounded-md print:bg-gray-50 print:p-1">
                      <div className="flex flex-wrap gap-1 print:gap-1">
                        {sortedCabNos.map((cabNo, index) => (
                          <span 
                            key={index}
                            className="inline-block px-2 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono print:text-xs"
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
            margin: 0.5cm;
            size: letter;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-size: 10px;
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
            font-size: 10px;
          }
          input[type="checkbox"] {
            -webkit-appearance: checkbox;
            appearance: checkbox;
            width: 12px;
            height: 12px;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default App;