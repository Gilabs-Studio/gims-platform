package dto

type FinanceSettingResponse struct {
	ID          string `json:"id"`
	SettingKey  string `json:"setting_key"`
	Value       string `json:"value"`
	Description string `json:"description"`
	Category    string `json:"category"`
}

type UpsertFinanceSettingRequest struct {
	SettingKey  string `json:"setting_key"`
	Value       string `json:"value"`
	Description string `json:"description"`
	Category    string `json:"category"`
}

type BatchUpsertFinanceSettingsRequest struct {
	Settings []UpsertFinanceSettingRequest `json:"settings"`
}
