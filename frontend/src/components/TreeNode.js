import React, { useState } from 'react';

const TreeNode = ({ node, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  if (!node || !node.user) {
    return null;
  }

  const { user, children = [] } = node;
  const hasChildren = children && children.length > 0;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getDefaultPhotoUrl = () => {
    // Return a default avatar SVG
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#6264a7"/>
        <circle cx="20" cy="15" r="6" fill="white"/>
        <path d="M8 32c0-6.627 5.373-12 12-12s12 5.373 12 12" fill="white"/>
      </svg>
    `)}`;
  };

  const nodeStyle = {
    marginLeft: level * 40,
    marginBottom: 20,
    position: 'relative'
  };

  const connectorStyle = level > 0 ? {
    content: '',
    position: 'absolute',
    left: -20,
    top: '50%',
    width: 20,
    height: 1,
    backgroundColor: '#d1d1d1',
    zIndex: 1
  } : {};

  return (
    <div style={nodeStyle}>
      {level > 0 && <div style={connectorStyle}></div>}
      
      <div className="user-node">
        <img
          className="user-photo"
          src={`http://localhost:5000/api/user-photo/${user.id}`}
          alt={user.displayName}
          onError={(e) => {
            e.target.src = getDefaultPhotoUrl();
          }}
        />
        
        <div className="user-name">{user.displayName}</div>
        
        {user.jobTitle && (
          <div className="user-title">{user.jobTitle}</div>
        )}
        
        {user.department && (
          <div className="user-department">{user.department}</div>
        )}
        
        {user.mail && (
          <div className="user-email" style={{ fontSize: '11px', color: '#8a8886', marginTop: '4px' }}>
            {user.mail}
          </div>
        )}

        {hasChildren && (
          <button
            onClick={toggleExpanded}
            style={{
              marginTop: '8px',
              padding: '4px 8px',
              fontSize: '10px',
              backgroundColor: '#6264a7',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {isExpanded ? `Hide ${children.length} Report${children.length !== 1 ? 's' : ''}` : `Show ${children.length} Report${children.length !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="children-container">
          {children.map((child, index) => (
            <TreeNode
              key={child.user?.id || index}
              node={child}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeNode;
