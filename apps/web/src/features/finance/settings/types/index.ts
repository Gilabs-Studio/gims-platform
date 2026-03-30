export interface FinanceSetting {
  id: string;
  setting_key: string;
  value: string;
  description?: string;
  category?: string;
}

export interface UpsertFinanceSettingRequest {
  setting_key: string;
  value: string;
  description?: string;
  category?: string;
}

export interface BatchUpsertFinanceSettingsRequest {
  settings: UpsertFinanceSettingRequest[];
}
