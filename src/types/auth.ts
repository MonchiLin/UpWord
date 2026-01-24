export interface UserPreferences {
    readingStyles?: Record<string, string>;
    defaultLevel?: number;
}

export interface AdminState {
    isAdmin: boolean;
    preferences: UserPreferences;
}
