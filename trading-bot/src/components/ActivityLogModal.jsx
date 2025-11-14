import React, { useState } from 'react';
import { X, FileText, Download, Trash2 } from 'lucide-react';

export default function ActivityLogModal({ isOpen, onClose, logs }) {
  const [filter, setFilter] = useState('all');

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.type === filter;
  });

  const downloadLogs = () => {
    const csv = logs.map(log => `${log.timestamp},${log.type},${log.message}`).join('\n');
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `trading-logs-${new Date().toISOString()}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-96 overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Activity Log</h2>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white hover:bg-opacity-20 p-2 rounded transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filter & Actions */}
        <div className="border-b p-4 flex justify-between items-center bg-gray-50">
          <div className="flex gap-2">
            {['all', 'success', 'error', 'warning', 'info'].map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1 rounded text-sm font-semibold transition ${
                  filter === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={downloadLogs}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>

        {/* Logs Container */}
        <div className="h-72 overflow-y-auto p-4 bg-black">
          <div className="space-y-2">
            {filteredLogs.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No logs to display</p>
            ) : (
              filteredLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`animate-slideIn p-3 rounded border-l-4 ${
                    log.type === 'success'
                      ? 'bg-green-900 bg-opacity-30 border-green-500 text-green-300'
                      : log.type === 'error'
                      ? 'bg-red-900 bg-opacity-30 border-red-500 text-red-300'
                      : log.type === 'warning'
                      ? 'bg-yellow-900 bg-opacity-30 border-yellow-500 text-yellow-300'
                      : 'bg-blue-900 bg-opacity-30 border-blue-500 text-blue-300'
                  }`}
                  style={{
                    animation: `slideIn 0.3s ease-out ${idx * 0.05}s both`,
                  }}
                >
                  <div className="flex justify-between items-start">
                    <p className="font-mono text-sm">{log.message}</p>
                  </div>
                  <p className="text-xs opacity-75 mt-1">[{log.timestamp}]</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CSS Animations */}
        <style>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          .animate-slideUp {
            animation: slideUp 0.3s ease-out;
          }

          .animate-slideIn {
            animation-timing-function: ease-out;
          }
        `}</style>
      </div>
    </div>
  );
}
