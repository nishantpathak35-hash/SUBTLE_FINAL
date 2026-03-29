import { create } from 'zustand';

interface ERPSettings {
  defaultGstRate: number;
  defaultMargin: number;
  currencySymbol: string;
  projectCategories: string[];
}

interface SettingsState {
  erpSettings: ERPSettings;
  setERPSettings: (settings: ERPSettings) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  fetchSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  erpSettings: {
    defaultGstRate: 18,
    defaultMargin: 20,
    currencySymbol: '₹',
    projectCategories: ['Residential', 'Commercial', 'Industrial', 'Hospitality'],
  },
  setERPSettings: (settings) => set({ erpSettings: settings }),
  isLoading: true,
  setIsLoading: (loading) => set({ isLoading: loading }),
  fetchSettings: async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        set({
          erpSettings: {
            defaultGstRate: data.defaultGstRate,
            defaultMargin: data.defaultMargin,
            currencySymbol: data.currencySymbol,
            projectCategories: data.projectCategories.split(',').map((c: string) => c.trim()),
          },
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
