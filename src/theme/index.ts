import tokens from "./tokens.json";

export type ThemeName = keyof typeof tokens;

export const theme = {
  institutionalLight: tokens.institutionalLight,
  dark: tokens.dark,
};

export const defaultTheme: ThemeName = "institutionalLight";
