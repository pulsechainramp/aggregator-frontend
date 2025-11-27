import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { useAppDispatch } from '../../store/hooks';
import { updateReferralFeeBasisPoints, fetchReferralFeeBasisPoints, fetchPromoConstants } from '../../store/referralSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import useWallet from '../../hooks/useWallet';
import { useNumberFormat } from '../../context/NumberFormatContext';

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
  const maxPromoBps = useSelector((state: RootState) => state.referral.maxPromoBps);
  const error = useSelector((state: RootState) => state.referral.error);
  const { sanitizeInput, parseInput, formatNumber } = useNumberFormat();
  
  const [customFee, setCustomFee] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<'preset' | 'custom'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<number>(25);
  const [inputError, setInputError] = useState<string>('');
  const [hasUserInteracted, setHasUserInteracted] = useState<boolean>(false);

  const contractMaxBps = typeof maxPromoBps === "number" && Number.isFinite(maxPromoBps) ? maxPromoBps : 300;
  const maxPercent = contractMaxBps / 100;
  const presetOptions = [10, 25, 50, 100, 150, 200].filter((bps) => bps <= contractMaxBps); // Basis points
  const minPercent = 0.1;

  const renderPercentValue = (value: number) =>
    `${formatNumber(value, { minFractionDigits: value < 1 ? 1 : 1, maxFractionDigits: 2 })}%`;

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
      dispatch(fetchPromoConstants());
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
        const percentValue = parseInt(currentFeeBasisPoints) / 100;
        setCustomFee(
          formatNumber(percentValue, {
            maxFractionDigits: 4,
            minFractionDigits: percentValue < 1 ? 1 : 0,
          })
        );
      }
      setInputError('');
    }
  }, [isOpen, currentFeeBasisPoints, presetOptions, hasUserInteracted, formatNumber]);

  const handlePresetSelect = (basisPoints: number) => {
    setSelectedOption('preset');
    setSelectedPreset(basisPoints);
    setCustomFee('');
    setInputError('');
    setHasUserInteracted(true);
  };

  const handleCustomInputChange = (value: string) => {
    const sanitized = sanitizeInput(value);
    setCustomFee(sanitized);
    setSelectedOption('custom'); // Ensure we're in custom mode when typing
    setInputError('');
    setHasUserInteracted(true);
    
    if (sanitized === '') {
      setInputError('');
      return;
    }

    const numValue = parseInput(sanitized);
    if (!Number.isFinite(numValue)) {
      setInputError('Please enter a valid number');
    } else if (numValue < minPercent) {
      setInputError(`Fee must be at least ${renderPercentValue(minPercent)}`);
    } else if (numValue > maxPercent) {
      const maxDisplay = formatNumber(maxPercent, { minFractionDigits: 2, maxFractionDigits: 2 });
      setInputError(`Fee cannot exceed ${maxDisplay}% (contract max)`);
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
        const numValue = parseInput(customFee);
        if (Number.isFinite(numValue) && numValue >= 0.1 && numValue <= maxPercent) {
          const clampedPercent = Math.min(numValue, maxPercent);
          const bpsValue = Math.round(clampedPercent * 100);
          feeBasisPoints = bpsValue.toString();
          if (bpsValue > contractMaxBps) {
            const maxDisplay = formatNumber(maxPercent, { minFractionDigits: 2, maxFractionDigits: 2 });
            toast.warn(`Fee capped to ${maxDisplay}% (contract maximum).`);
          }
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

      const numericBps = Number(feeBasisPoints);
      if (numericBps > contractMaxBps) {
        feeBasisPoints = contractMaxBps.toString();
        const maxDisplay = formatNumber(maxPercent, { minFractionDigits: 2, maxFractionDigits: 2 });
        toast.warn(`Fee capped to ${maxDisplay}% (contract maximum).`);
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

  const isCustomInputMissing = selectedOption === 'custom' && !customFee;

  const formatBasisPointsToPercentage = (basisPoints: number): string => {
    const percentValue = basisPoints / 100;
    return `${formatNumber(percentValue, { minFractionDigits: 2, maxFractionDigits: 2 })}%`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div 
            className="w-96 max-w-[90vw] rounded-2xl border border-border bg-bg-surface p-6 shadow-floating"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-text">Referral Fee Setting</h2>
              <button
                onClick={onClose}
                className="text-text-muted transition-colors hover:text-primary"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-text-muted mb-6">
              Set your referral fee percentage. This is the fee you'll earn when users swap using your referral code.
            </p>

            {/* Current Fee Display */}
            {currentFeeBasisPoints && (
              <div className="mb-6 rounded-lg border border-success bg-success/10 p-3">
                <p className="text-sm font-medium text-success">Current Fee</p>
                <p className="text-lg font-semibold text-success">
                  {formatBasisPointsToPercentage(parseInt(currentFeeBasisPoints))}
                </p>
              </div>
            )}

            {feeBasisPointsLoading && (
              <div className="mb-6 rounded-lg border border-primary/30 bg-primary-050 p-3">
                <div className="flex items-center">
                  <svg className="mr-2 h-5 w-5 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm text-text-muted">Loading current fee...</p>
                </div>
              </div>
            )}

            {/* Preset Options */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-muted mb-3">
                Quick Select
              </label>
              <div className="grid grid-cols-3 gap-2">
                {presetOptions.map((basisPoints) => (
                  <button
                    key={basisPoints}
                    onClick={() => handlePresetSelect(basisPoints)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none ${
                      selectedOption === 'preset' && selectedPreset === basisPoints
                        ? 'border-primary bg-primary-050 text-primary shadow-sm'
                        : 'border-border bg-bg-surface text-text-muted hover:border-primary hover:bg-primary-050 hover:text-primary'
                    }`}
                  >
                    {formatBasisPointsToPercentage(basisPoints)}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-muted mb-3">
                Custom Fee
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={customFee}
                  onChange={(e) => handleCustomInputChange(e.target.value)}
                  onFocus={() => {
                    setSelectedOption('custom');
                    setHasUserInteracted(true);
                  }}
                  placeholder="0.00"
                  className={`w-full rounded-lg border px-4 py-3 bg-bg-surface text-base text-text placeholder:text-text-muted transition-all focus:outline-none focus:ring-2 ${
                    inputError
                      ? 'border-danger focus:border-danger focus:ring-danger/30'
                      : selectedOption === 'custom'
                      ? 'border-focus shadow-sm focus:border-focus focus:ring-focus/30'
                      : 'border-border focus:ring-focus/30'
                  }`}
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-text-muted">
                  %
                </span>
              </div>
              {inputError && (
                <p className="mt-2 text-sm text-danger">{inputError}</p>
              )}
              {selectedOption === 'custom' && customFee && !inputError && (
                <p className="text-success text-sm mt-2">
                  Fee will be set to: {customFee}%
                </p>
              )}
              {isCustomInputMissing && (
                <p className="mt-2 text-sm text-text-muted">
                  Enter a percentage to set your custom fee.
                </p>
              )}
            </div>

            {/* Info Box */}
            <div className="mb-6 rounded-lg border border-primary/30 bg-primary-050 p-3">
              <div className="flex items-start">
                <svg className="mt-0.5 mr-2 h-5 w-5 flex-shrink-0 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-text">Fee Range</p>
                  <p className="mt-1 text-sm text-text-muted">
                    Your referral fee must be between {renderPercentValue(minPercent)} and {renderPercentValue(maxPercent)}. Higher fees may reduce user adoption.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 rounded-lg border border-danger/30 bg-danger/10 p-3">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={updatingFeeBasisPoints}
                className="flex-1 rounded-lg border border-border bg-bg-surface px-4 py-3 text-text font-semibold transition-colors hover:bg-primary-050 disabled:cursor-not-allowed disabled:border-border disabled:text-text-muted focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={
                  !!inputError ||
                  updatingFeeBasisPoints ||
                  !account ||
                  isCustomInputMissing
                }
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-white font-semibold transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-border disabled:text-text-muted focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
              >
                {updatingFeeBasisPoints ? (
                  <>
                    <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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


