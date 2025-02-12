export interface ApiEndpoint {
    id: string;
    path: string;
    method: string;
    description?: string;
    parameters: ApiParameter[];
    responseType: string;
    apifoxFolder: string;
    location: {
        filePath: string;
        line: number;
        character: number;
    };
}

export interface ApiParameter {
    name: string;
    parameterType: string;
    type: string;
    required: boolean;
    description?: string;
    object?: object;
}

export interface MockRule {
    fieldName: string;
    fieldType: string;
    rule: string;
} 

export interface Definition {
    type: string;
    properties: {
        [key: string]: {
            type: string;
            format?: string;
            description?: string;
        };
    };
    xml?: {
        name: string;
    };
}

export interface Definitions {
    [key: string]: Definition;
}
