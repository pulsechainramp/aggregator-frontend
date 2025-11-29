import { configureStore } from "@reduxjs/toolkit";
import swapReducer from "./swapSlice";
import bridgeReducer from "./bridgeSlice";
import activityReducer from "./activitySlice";
import referralReducer from "./referralSlice";
import startProgressReducer from "./startProgressSlice";

export const store = configureStore({
  reducer: {
    swap: swapReducer,
    bridge: bridgeReducer,
    activity: activityReducer,
    referral: referralReducer,
    startProgress: startProgressReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 
