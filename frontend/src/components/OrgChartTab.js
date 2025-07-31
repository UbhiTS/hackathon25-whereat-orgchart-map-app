import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TreeNode from './TreeNode';
import { getConfig } from '../config';

const OrgChartTab = ({ teamsContext, getAuthToken }) => {
  const [userEmail, setUserEmail] = useState('');
  const [orgData, setOrgData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get current user's email from Teams context
  useEffect(() => {
    if (teamsContext && teamsContext.user && teamsContext.user.userPrincipalName) {
      setUserEmail(teamsContext.user.userPrincipalName);
    }
  }, [teamsContext]);

  const fetchOrgChart = async (email) => {
    if (!email) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const config = getConfig();
      const backendUrl = config.backendUrl;
      const response = await axios.get(`${backendUrl}/api/org-hierarchy/${encodeURIComponent(email)}`);
      
      if (response.data.success) {
        setOrgData(response.data.data);
      } else {
        setError(response.data.error || 'Failed to fetch organization data');
      }
    } catch (err) {
      console.error('Error fetching org chart:', err);
      setError('Failed to connect to the server. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchOrgChart(userEmail);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="tab-container">
      <div className="tab-header">
        <h1 className="tab-title">Organization Chart</h1>
        <div className="search-container">
          <input
            type="email"
            className="search-input"
            placeholder="Enter user email (e.g., user@company.com)"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <button
            className="search-button"
            onClick={handleSearch}
            disabled={loading || !userEmail}
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
      </div>

      <div className="tab-content">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {!orgData && !loading && !error && (
          <div className="info-message">
            Enter a user's email address above to view their organizational hierarchy.
            The chart will show all direct and indirect reports in a tree structure.
          </div>
        )}

        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Fetching organization data...</p>
          </div>
        )}

        {orgData && !loading && (
          <div className="org-chart-container">
            <div className="tree-container">
              <TreeNode node={orgData} level={0} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrgChartTab;
