/**
 * Format fee basis points to percentage
 * @param feeBasisPoints - The fee basis points as a string
 * @returns Formatted percentage string
 */
export const formatFeeBasisPoints = (feeBasisPoints: string): string => {
  try {
    const fee = parseInt(feeBasisPoints);
    if (isNaN(fee)) return "0.00%";
    return `${(fee / 100).toFixed(2)}%`;
  } catch (error) {
    console.error('Error formatting fee basis points:', error);
    return "0.00%";
  }
};

// Utility functions for handling referral codes

export const REFERRAL_CODE_KEY = 'pulsechain_referral_code';

/**
 * Extract referral code from URL parameters and save to localStorage
 * @returns The extracted referral code or null if not found
 */
export const extractAndSaveReferralCode = (): string | null => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('ref') || urlParams.get('code');
    
    if (referralCode) {
      // Check if this is a different referral code than what's already stored
      const existingCode = getStoredReferralCode();
      
      if (existingCode !== referralCode) {
        // Update localStorage with new referral code
        localStorage.setItem(REFERRAL_CODE_KEY, referralCode);
        console.log(`Referral code updated: ${existingCode} → ${referralCode}`);
      }
      
      // Remove the code parameter from URL without page reload
      urlParams.delete('code');
      urlParams.delete('ref');
      const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '');
      window.history.replaceState({}, '', newUrl);
      
      return referralCode;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting referral code:', error);
    return null;
  }
};

/**
 * Check if a referral is a self-referral (user referring themselves)
 * @param userAddress - The current user's address
 * @param referralAddress - The referral address to check against
 * @returns True if it's a self-referral, false otherwise
 * 
 * This prevents users from referring themselves, which would be invalid
 * and could potentially cause issues with the referral system.
 */
export const isSelfReferral = (userAddress: string, referralAddress: string): boolean => {
  if (!userAddress || !referralAddress) return false;
  return userAddress.toLowerCase() === referralAddress.toLowerCase();
};

/**
 * Get referral code from localStorage
 * @returns The stored referral code or null if not found
 */
export const getStoredReferralCode = (): string | null => {
  try {
    return localStorage.getItem(REFERRAL_CODE_KEY);
  } catch (error) {
    console.error('Error getting stored referral code:', error);
    return null;
  }
};

/**
 * Remove referral code from localStorage
 */
export const removeStoredReferralCode = (): void => {
  try {
    localStorage.removeItem(REFERRAL_CODE_KEY);
  } catch (error) {
    console.error('Error removing stored referral code:', error);
  }
};

/**
 * Check if current URL has a referral code parameter
 * @returns True if URL contains referral code parameter
 */
export const hasReferralCodeInUrl = (): boolean => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has('ref') || urlParams.has('code');
};

/**
 * Check if a new referral code is different from the stored one
 * @param newCode The new referral code to check
 * @returns True if the code is new/different
 */
export const isNewReferralCode = (newCode: string): boolean => {
  const existingCode = getStoredReferralCode();
  return existingCode !== newCode;
};

/**
 * Get referral code info for display purposes
 * @returns Object with referral code and whether it's new
 */
export const getReferralCodeInfo = () => {
  const code = getStoredReferralCode();
  const hasCode = !!code;
  
  return {
    code,
    hasCode,
    isNew: false // This will be set by the component when processing new codes
  };
}; 