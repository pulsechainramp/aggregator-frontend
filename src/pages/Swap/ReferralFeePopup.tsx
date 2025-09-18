import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { useAppDispatch } from '../../store/hooks';
import { updateReferralFeeBasisPoints, fetchReferralFeeBasisPoints } from '../../store/referralSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import useWallet from '../../hooks/useWallet';

interface ReferralFeePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReferralFeePopup: React.FC<ReferralFeePopupProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const { account } = useWallet();
  const currentFeeBasisPoints = useSelector((state: RootState) => state.referral.referralFeeBasisPoints);
  const updatingFeeBasisPoints = useSelector((state: RootState) => state.referral.updatingFeeBasisPoints);
  const feeBasisPointsLoading = useSelector((state: RootState) => state.referral.feeBasisPointsLoading);
  const error = useSelector((state: RootState) => state.referral.error);
  
  const [customFee, setCustomFee] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<'preset' | 'custom'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<number>(25);
  const [inputError, setInputError] = useState<string>('');
  const [hasUserInteracted, setHasUserInteracted] = useState<boolean>(false);

  const presetOptions = [10, 25, 50, 100, 150, 200]; // Basis points: 0.1%, 0.25%, 0.5%, 1%, 1.5%, 2%

  // Reset state when popup opens
  useEffect(() => {
    if (isOpen) {
      setHasUserInteracted(false);
      setInputError('');
    }
  }, [isOpen]);

  // Fetch user's fee basis points when popup opens
  useEffect(() => {
    if (isOpen && account) {
      // Always fetch user's fee when popup opens to ensure we have the latest
      dispatch(fetchReferralFeeBasisPoints(account));
    }
  }, [isOpen, account, dispatch]);

  useEffect(() => {
    if (isOpen && currentFeeBasisPoints && !hasUserInteracted) {
      // Only set initial state if user hasn't interacted yet
      const matchingPreset = presetOptions.find(option => option === parseInt(currentFeeBasisPoints));
      if (matchingPreset) {
        setSelectedOption('preset');
        setSelectedPreset(matchingPreset);
        setCustomFee('');
      } else {
        setSelectedOption('custom');
        setCustomFee((parseInt(currentFeeBasisPoints) / 100).toString());
      }
      setInputError('');
    }
  }, [isOpen, currentFeeBasisPoints, presetOptions, hasUserInteracted]);

  const handlePresetSelect = (basisPoints: number) => {
    setSelectedOption('preset');
    setSelectedPreset(basisPoints);
    setCustomFee('');
    setInputError('');
    setHasUserInteracted(true);
  };

  const handleCustomInputChange = (value: string) => {
    setCustomFee(value);
    setSelectedOption('custom'); // Ensure we're in custom mode when typing
    setInputError('');
    setHasUserInteracted(true);
    
    const numValue = parseFloat(value);
    if (value === '') {
      setInputError('');
    } else if (isNaN(numValue)) {
      setInputError('Please enter a valid number');
    } else if (numValue < 0.1) {
      setInputError('Fee must be at least 0.1%');
    } else if (numValue > 3.0) {
      setInputError('Fee cannot exceed 3%');
    } else {
      setInputError('');
    }
  };

  const handleSave = async () => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      let feeBasisPoints: string;
      
      if (selectedOption === 'custom' && customFee) {
        const numValue = parseFloat(customFee);
        if (numValue >= 0.1 && numValue <= 3.0) {
          feeBasisPoints = (numValue * 100).toString(); // Convert percentage to basis points
        } else {
          setInputError('Invalid fee amount');
          return;
        }
      } else if (selectedOption === 'preset') {
        // Use the selected preset
        feeBasisPoints = selectedPreset.toString();
      } else {
        setInputError('Please select a fee amount');
        return;
      }

      await dispatch(updateReferralFeeBasisPoints({ 
        newFeeBasisPoints: feeBasisPoints, 
        account 
      })).unwrap();
      
      toast.success('Referral fee updated successfully!');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update referral fee');
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const formatBasisPointsToPercentage = (basisPoints: number): string => {
    return `${(basisPoints / 100).toFixed(2)}%`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div 
            className="bg-[#2b2e4a] rounded-lg p-6 w-96 max-w-[90vw] shadow-xl border border-[#3a3f5a]"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Referral Fee Setting</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-300 mb-6">
              Set your referral fee percentage. This is the fee you'll earn when users swap using your referral code.
            </p>

            {/* Current Fee Display */}
            {currentFeeBasisPoints && (
              <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <div className="flex items-center">
                  <span className="text-emerald-400 mr-2">💰</span>
                  <div>
                    <p className="text-sm text-emerald-400 font-medium">Current Fee</p>
                    <p className="text-lg text-emerald-300 font-bold">
                      {formatBasisPointsToPercentage(parseInt(currentFeeBasisPoints))}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {feeBasisPointsLoading && (
              <div className="mb-6 p-3 bg-slate-500/10 border border-slate-500/30 rounded-lg">
                <div className="flex items-center">
                  <svg className="animate-spin h-5 w-5 text-slate-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm text-slate-400">Loading current fee...</p>
                </div>
              </div>
            )}

                        {/* Preset Options */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Quick Select
              </label>
              <div className="grid grid-cols-3 gap-2">
                {presetOptions.map((basisPoints) => (
                  <button
                    key={basisPoints}
                    onClick={() => handlePresetSelect(basisPoints)}
                    className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                      selectedOption === 'preset' && selectedPreset === basisPoints
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-lg'
                        : 'border-[#3a3f5a] hover:border-emerald-500/50 hover:bg-emerald-500/10 text-gray-300 bg-[#1e2030] hover:text-emerald-300'
                    }`}
                  >
                    {formatBasisPointsToPercentage(basisPoints)}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Custom Fee
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={customFee}
                  onChange={(e) => handleCustomInputChange(e.target.value)}
                  onFocus={() => {
                    setSelectedOption('custom');
                    setHasUserInteracted(true);
                  }}
                  placeholder="0.00"
                  step="0.01"
                  min="0.1"
                  max="3.0"
                  className={`w-full px-4 py-3 border-2 rounded-lg transition-all bg-[#1e2030] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    selectedOption === 'custom'
                      ? 'border-emerald-500 bg-[#1e2030]'
                      : 'border-[#3a3f5a]'
                  } ${inputError ? 'border-red-500' : ''}`}
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  %
                </span>
              </div>
              {inputError && (
                <p className="text-red-400 text-sm mt-2">{inputError}</p>
              )}
              {selectedOption === 'custom' && customFee && !inputError && (
                <p className="text-emerald-400 text-sm mt-2">
                  Fee will be set to: {customFee}%
                </p>
              )}
            </div>

            {/* Info Box */}
            <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm text-blue-300 font-medium">Fee Range</p>
                  <p className="text-sm text-blue-200 mt-1">
                    Your referral fee must be between 0.1% and 3.0%. Higher fees may reduce user adoption.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={updatingFeeBasisPoints}
                className="flex-1 px-4 py-3 border border-[#3a3f5a] text-gray-300 rounded-lg hover:bg-[#3a3f5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!!inputError || updatingFeeBasisPoints || !account}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {updatingFeeBasisPoints ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Update Fee'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReferralFeePopup; 