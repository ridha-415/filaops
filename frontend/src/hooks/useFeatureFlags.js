import { useState, useEffect } from 'react';
import { API_URL } from '../config/api';

export const useFeatureFlags = () => {
  const [tier, setTier] = useState('open');
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTier = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setTier('open');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/api/v1/features/current`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setTier(data.tier);
          setFeatures(data.features || []);
        } else {
          setTier('open');
        }
      } catch {
        // Tier fetch failure - default to 'open' tier
        setTier('open');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTier();
  }, []);

  const hasFeature = (featureName) => {
    return features.includes(featureName);
  };

  const isPro = tier === 'pro' || tier === 'enterprise';
  const isEnterprise = tier === 'enterprise';

  return {
    tier,
    features,
    hasFeature,
    isPro,
    isEnterprise,
    loading
  };
};

