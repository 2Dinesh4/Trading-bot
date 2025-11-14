import React, { useState } from 'react';
import { apiKeysService } from '../services/apiKeysService';

const APIKeyCard = ({ apiKey, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [keyName, setKeyName] = useState(apiKey.key_name || '');

  const handleToggleActive = async () => {
    try {
      await apiKeysService.updateKey(apiKey.id, {
        is_active: !apiKey.is_active
      });
      onUpdate();
    } catch (error) {
      console.error('Error toggling key:', error);
    }
  };

  const handleUpdateName = async () => {
    try {
      await apiKeysService.updateKey(apiKey.id, {
        key_name: keyName
      });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating name:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this API key?')) {
      try {
        await apiKeysService.deleteKey(apiKey.id);
        onDelete();
      } catch (error) {
        console.error('Error deleting key:', error);
      }
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          {isEditing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="flex-1 px-2 py-1 border rounded"
                placeholder="Key name"
              />
              <button
                onClick={handleUpdateName}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <h3 className="text-lg font-semibold">
              {apiKey.key_name || 'Unnamed Key'}
              <button
                onClick={() => setIsEditing(true)}
                className="ml-2 text-sm text-blue-500 hover:text-blue-700"
              >
                ✏️
              </button>
            </h3>
          )}
          <p className="text-sm text-gray-600 capitalize">{apiKey.exchange}</p>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            apiKey.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {apiKey.is_active ? '✅ Active' : '❌ Inactive'}
        </span>
      </div>

      <div className="text-sm text-gray-500 mb-3">
        <p>Created: {new Date(apiKey.created_at).toLocaleDateString()}</p>
        {apiKey.last_used_at && (
          <p>Last used: {new Date(apiKey.last_used_at).toLocaleDateString()}</p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleToggleActive}
          className={`flex-1 py-2 rounded font-semibold ${
            apiKey.is_active
              ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {apiKey.is_active ? 'Deactivate' : 'Activate'}
        </button>

        <button
          onClick={handleDelete}
          className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-semibold"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default APIKeyCard;
