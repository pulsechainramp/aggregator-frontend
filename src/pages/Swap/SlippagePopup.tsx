import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { setSlippage } from '../../store/swapSlice';
import { motion, AnimatePresence } from 'framer-motion';

interface SlippagePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const SlippagePopup: React.FC<SlippagePopupProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const currentSlippage = useSelector((state: RootState) => state.swap.slippage);
  
  const [customSlippage, setCustomSlippage] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<'preset' | 'custom'>('preset');
  const [error, setError] = useState<string>('');

  const presetOptions = [0.1, 0.5, 1.0, 2.0];

  useEffect(() => {
    if (isOpen) {
      // Check if current slippage matches any preset
      const matchingPreset = presetOptions.find(option => option === currentSlippage);
      if (matchingPreset) {
        setSelectedOption('preset');
        setCustomSlippage('');
      } else {
        setSelectedOption('custom');
        setCustomSlippage(currentSlippage.toString());
      }
      setError('');
    }
  }, [isOpen, currentSlippage, presetOptions]);

  const handlePresetSelect = (value: number) => {
    setSelectedOption('preset');
    setCustomSlippage('');
    setError('');
    dispatch(setSlippage(value));
  };

  const handleCustomInputChange = (value: string) => {
    setCustomSlippage(value);
    setError('');
    
    const numValue = parseFloat(value);
    if (value === '') {
      setError('');
    } else if (isNaN(numValue)) {
      setError('Please enter a valid number');
    } else if (numValue < 0.01) {
      setError('Slippage must be at least 0.01%');
    } else if (numValue > 50) {
      setError('Slippage cannot exceed 50%');
    } else {
      setError('');
      dispatch(setSlippage(numValue));
    }
  };

  const handleSave = () => {
    if (selectedOption === 'custom' && customSlippage) {
      const numValue = parseFloat(customSlippage);
      if (numValue >= 0.01 && numValue <= 50) {
        dispatch(setSlippage(numValue));
        onClose();
      }
    } else if (selectedOption === 'preset') {
      onClose();
    }
  };

  const handleCancel = () => {
    // Reset to original value
    dispatch(setSlippage(currentSlippage));
    onClose();
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
            className="w-96 max-w-[90vw] rounded-lg border border-border bg-bg-surface p-6 shadow-floating"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-text">Slippage Tolerance</h2>
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
              Your transaction will revert if the price changes unfavorably by more than this percentage.
            </p>

            {/* Preset Options */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-muted mb-3">
                Quick Select
              </label>
              <div className="grid grid-cols-2 gap-3">
                {presetOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => handlePresetSelect(option)}
                    className={`rounded-lg border px-4 py-3 transition-colors ${
                      selectedOption === 'preset' && currentSlippage === option
                        ? 'border-primary bg-primary-050 text-primary font-semibold'
                        : 'border-border bg-bg-page text-text hover:border-primary hover:bg-primary-050/60'
                    }`}
                  >
                    {option}%
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-muted mb-3">
                Custom
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={customSlippage}
                  onChange={(e) => handleCustomInputChange(e.target.value)}
                  onFocus={() => setSelectedOption('custom')}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  max="50"
                  className={`w-full rounded-lg border px-4 py-3 text-text transition-colors placeholder-text-muted focus:outline-none ${
                    selectedOption === 'custom' ? 'border-primary bg-primary-050/40' : 'border-border bg-bg-page'
                  } ${error ? 'border-danger' : ''}`}
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-text-subtle">
                  %
                </span>
              </div>
              {error && (
                <p className="mt-2 text-sm text-danger">{error}</p>
              )}
            </div>

            {/* Warning for high slippage */}
            {currentSlippage > 5 && (
              <div className="mb-6 rounded-lg border border-warning bg-warning/10 p-3">
                <div className="flex items-start">
                  <svg className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-warning" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-warning">High Slippage Warning</p>
                    <p className="mt-1 text-sm text-warning">
                      A slippage of {currentSlippage}% is quite high. This may result in significant price impact.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 rounded-lg border border-border px-4 py-3 text-text transition-colors hover:bg-primary-050/60"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!!error || (selectedOption === 'custom' && !customSlippage)}
                className="flex-1 rounded-lg bg-primary px-4 py-3 text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-border disabled:text-text-muted"
              >
                Save
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SlippagePopup;
