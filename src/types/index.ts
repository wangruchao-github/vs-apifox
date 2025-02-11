export interface ApiEndpoint {
    path: string;
    method: string;
    description?: string;
    parameters: ApiParameter[];
    responseType: string;
}

export interface ApiParameter {
    name: string;
    type: string;
    required: boolean;
    description?: string;
}

export interface MockRule {
    fieldName: string;
    fieldType: string;
    rule: string;
} 